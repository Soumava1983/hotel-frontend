document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const registerFromLoginBtn = document.getElementById("registerFromLoginBtn");
    const loginModalElement = document.getElementById("loginModal");
    const registerModalElement = document.getElementById("registerModal");
    const searchForm = document.getElementById("searchForm");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
    const locationInput = document.getElementById("location");
    const bookModalElement = document.getElementById("bookModal");
    const bookForm = document.getElementById("bookForm");
    const bookingsBtn = document.getElementById("bookingsBtn");
    const bookingsModalElement = document.getElementById("bookingsModal");
    const bookingList = document.getElementById("bookingList");

    // Initialize Bootstrap Modals
    const loginModal = new bootstrap.Modal(loginModalElement);
    const registerModal = new bootstrap.Modal(registerModalElement);
    const bookModal = new bootstrap.Modal(bookModalElement);
    const bookingsModal = new bootstrap.Modal(bookingsModalElement);

    // Fix accessibility issue: Move focus after loginModal is hidden
    loginModalElement.addEventListener("hidden.bs.modal", () => {
        // Move focus to the login button in the navbar
        loginBtn.focus();
    });

    let lastSearch = JSON.parse(localStorage.getItem("lastSearch")) || null;
    let allRooms = []; // Cache rooms for booking modal

    // Set minimum dates for check-in and check-out
    const today = new Date().toISOString().split("T")[0];
    checkInInput.setAttribute("min", today);
    checkOutInput.setAttribute("min", today);

    // Update check-out minimum date based on check-in
    checkInInput.addEventListener("change", () => {
        const checkInDate = new Date(checkInInput.value);
        const minCheckOutDate = new Date(checkInDate);
        minCheckOutDate.setDate(checkInDate.getDate() + 1);
        checkOutInput.setAttribute("min", minCheckOutDate.toISOString().split("T")[0]);
        if (checkOutInput.value && new Date(checkOutInput.value) <= checkInDate) {
            checkOutInput.value = "";
        }
    });

    // Clear inputs on page reload
    window.addEventListener("load", () => {
        locationInput.value = "";
        checkInInput.value = "";
        checkOutInput.value = "";
        localStorage.removeItem("lastSearch");
    });

    // Cache for locations
    let cachedLocations = null;

    // Fetch unique locations from the server
    async function fetchLocations() {
        if (cachedLocations) {
            return cachedLocations;
        }

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/unique-locations");
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            const locations = await response.json();
            cachedLocations = locations.sort();
            return cachedLocations;
        } catch (error) {
            console.error("Error fetching locations for autocomplete:", error);
            return [];
        }
    }

    // Debounce function to limit the rate of updates
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // Autocomplete for location input using datalist
    locationInput.addEventListener("input", debounce(async () => {
        const query = locationInput.value.toLowerCase().trim();
        if (query.length < 2) {
            removeDatalist();
            return;
        }

        const locations = await fetchLocations();
        const filteredLocations = locations.filter(loc => loc.toLowerCase().includes(query));

        removeDatalist();
        const datalist = document.createElement("datalist");
        datalist.id = "locationSuggestions";

        filteredLocations.forEach(loc => {
            const option = document.createElement("option");
            option.value = loc;
            datalist.appendChild(option);
        });

        document.body.appendChild(datalist);
        locationInput.setAttribute("list", "locationSuggestions");
    }, 300));

    // Prevent duplicate popups after selection
    locationInput.addEventListener("change", () => {
        removeDatalist();
    });

    function removeDatalist() {
        const existingDatalist = document.getElementById("locationSuggestions");
        if (existingDatalist) {
            existingDatalist.remove();
        }
        locationInput.removeAttribute("list");
    }

    // Check user session
    async function checkSession() {
        const currentToken = localStorage.getItem("token");
        console.log("Checking session with token:", currentToken);
        if (!currentToken) {
            console.log("No token found, user is not logged in");
            loginBtn.style.display = "block";
            logoutBtn.style.display = "none";
            bookingsBtn.style.display = "none";
            return;
        }

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/check-session", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + currentToken,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error("HTTP error " + response.status + ": " + text);
            }

            const data = await response.json();
            console.log("Check session response:", data);
            if (data.loggedIn) {
                loginBtn.style.display = "none";
                logoutBtn.style.display = "block";
                bookingsBtn.style.display = "block";
            } else {
                console.log("Session invalid:", data.error);
                loginBtn.style.display = "block";
                logoutBtn.style.display = "none";
                bookingsBtn.style.display = "none";
                localStorage.removeItem("token");
            }
        } catch (error) {
            console.error("Error checking session:", error);
            loginBtn.style.display = "block";
            logoutBtn.style.display = "none";
            bookingsBtn.style.display = "none";
            localStorage.removeItem("token");
        }
    }

    checkSession();

    // Restore last search if available
    if (lastSearch) {
        document.getElementById("location").value = lastSearch.location;
        document.getElementById("checkIn").value = lastSearch.checkIn;
        document.getElementById("checkOut").value = lastSearch.checkOut;
    }

    // Show login modal
    loginBtn.addEventListener("click", () => {
        loginModal.show();
    });

    // Show register modal from login modal
    registerFromLoginBtn.addEventListener("click", () => {
        loginModal.hide();
        registerModal.show();
    });

    // Handle login form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        console.log("Attempting login with email: " + email);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log("Login response:", JSON.stringify(data, null, 2));
            if (response.ok) {
                localStorage.setItem("token", data.token);
                loginModal.hide();
                await checkSession();
            } else {
                alert(data.error || "Login failed");
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert("An error occurred during login");
        }
    });

    // Handle register form submission
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Register form submitted");
        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const phone = document.getElementById("registerPhone").value;
        console.log("Attempting registration with email: " + email);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password, phone_number: phone }),
            });

            const data = await response.json();
            console.log("Register response:", JSON.stringify(data, null, 2));
            if (response.ok) {
                alert("Registration successful! Please log in.");
                registerForm.reset();
                registerModal.hide();
                loginModal.show();
            } else {
                alert(data.error || "Registration failed");
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("An error occurred during registration");
        }
    });

    // Handle search form submission
    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const location = document.getElementById("location").value.toLowerCase().trim();
        const checkIn = document.getElementById("checkIn").value;
        const checkOut = document.getElementById("checkOut").value;

        if (!checkIn || !checkOut) {
            alert("Please select check-in and check-out dates.");
            return;
        }

        lastSearch = { location, checkIn, checkOut };
        console.log("lastSearch updated on form submit:", lastSearch);
        localStorage.setItem("lastSearch", JSON.stringify(lastSearch));

        await searchRooms(location, checkIn, checkOut);
    });

    // Fetch and display hotels
    async function searchRooms(location, checkIn, checkOut) {
        console.log("Fetching rooms from /rooms with location: " + location);
        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/rooms?location=" + encodeURIComponent(location));
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            allRooms = await response.json();
            console.log("Rooms received:", allRooms);
            displayHotels(allRooms, checkIn, checkOut);
        } catch (error) {
            console.error("Error fetching rooms:", error);
            document.getElementById("results").innerHTML = "<p>Error fetching rooms. Please try again later.</p>";
        }
    }

    // Function to escape HTML characters for security
    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // Display hotels in a table under the searched location
    function displayHotels(rooms, checkIn, checkOut) {
        const resultsDiv = document.getElementById("results");
        if (!resultsDiv) {
            console.error("Results div not found");
            return;
        }
        resultsDiv.innerHTML = "";

        if (!rooms || rooms.length === 0) {
            resultsDiv.innerHTML = "<p>No hotels to display.</p>";
            console.log("No hotels to display.");
            return;
        }

        console.log("Sample room data:", rooms[0]);

        // Group rooms by hotel
        const groupedHotels = rooms.reduce((acc, room) => {
            const hotelName = room.hotel_name || "Unknown Hotel";
            if (!acc[hotelName]) {
                acc[hotelName] = {
                    name: hotelName,
                    location: room.location || "Unknown Location",
                    image: room.image || "https://via.placeholder.com/150", // Fallback image
                    rooms: []
                };
            }
            acc[hotelName].rooms.push(room);
            return acc;
        }, {});

        const hotels = Object.values(groupedHotels).sort((a, b) => a.name.localeCompare(b.name));

        // Group hotels by location
        const groupedByLocation = hotels.reduce((acc, hotel) => {
            const location = hotel.location;
            if (!acc[location]) {
                acc[location] = [];
            }
            acc[location].push(hotel);
            return acc;
        }, {});

        const sortedLocations = Object.keys(groupedByLocation).sort();

        sortedLocations.forEach(location => {
            const locationHotels = groupedByLocation[location];

            const locationSection = document.createElement("div");
            locationSection.className = "mb-4";

            const locationHeading = document.createElement("h3");
            locationHeading.className = "text-white mb-3";
            locationHeading.textContent = "Hotels in " + escapeHTML(location);
            locationSection.appendChild(locationHeading);

            const table = document.createElement("table");
            table.className = "table table-bordered table-striped text-white";
            table.style.backgroundColor = "#343a40"; // Dark background for table

            const thead = document.createElement("thead");
            thead.innerHTML = `
                <tr>
                    <th scope="col">Hotel Name</th>
                    <th scope="col">Photo</th>
                    <th scope="col">Location</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            locationHotels.forEach(hotel => {
                const row = document.createElement("tr");
                row.innerHTML = [
                    '<td><a href="#hotel-' + encodeURIComponent(hotel.name) + '" class="text-white">' + escapeHTML(hotel.name) + '</a></td>',
                    '<td><img src="' + hotel.image + '" alt="' + escapeHTML(hotel.name) + '" style="width: 100px; height: auto;" loading="lazy" onerror="this.src=\'https://via.placeholder.com/150\';"></td>',
                    '<td>' + escapeHTML(hotel.location) + '</td>'
                ].join("");
                tbody.appendChild(row);

                // Create a section for the hotel's rooms (hidden by default, can be toggled or linked)
                const hotelSection = document.createElement("div");
                hotelSection.id = "hotel-" + encodeURIComponent(hotel.name);
                hotelSection.className = "mt-3";
                hotelSection.style.display = "none"; // Hide by default, can be toggled with JS if needed

                const roomHeading = document.createElement("h4");
                roomHeading.className = "text-white";
                roomHeading.textContent = escapeHTML(hotel.name) + " Rooms";
                hotelSection.appendChild(roomHeading);

                const rowDiv = document.createElement("div");
                rowDiv.className = "row";
                hotel.rooms.forEach(room => {
                    const colDiv = document.createElement("div");
                    colDiv.className = "col-md-4 mb-2";

                    const cardDiv = document.createElement("div");
                    cardDiv.className = "card";

                    const amenitiesText = typeof room.amenities === "string" && room.amenities.trim() !== ""
                        ? room.amenities
                        : Array.isArray(room.amenities) && room.amenities.length > 0
                        ? room.amenities.join(", ")
                        : "None";

                    cardDiv.innerHTML = [
                        '<img src="' + room.image + '" class="card-img-top" alt="' + escapeHTML(room.name) + '">',
                        '<div class="card-body">',
                        '<h5 class="card-title">' + escapeHTML(room.name) + '</h5>',
                        '<p class="card-text">Location: ' + escapeHTML(room.location) + '</p>',
                        '<p class="card-text">Price: ₹' + room.price + ' per night</p>',
                        '<p class="card-text">Available Rooms: ' + room.available + '</p>',
                        '<p class="card-text">Amenities: ' + escapeHTML(amenitiesText) + '</p>',
                        '<button class="btn btn-primary book-now" data-room-id="' + room.id + '">Book Now</button>',
                        '</div>'
                    ].join("");

                    colDiv.appendChild(cardDiv);
                    rowDiv.appendChild(colDiv);
                });

                hotelSection.appendChild(rowDiv);
                locationSection.appendChild(hotelSection);
            });

            table.appendChild(tbody);
            locationSection.appendChild(table);
            resultsDiv.appendChild(locationSection);

            // Add click event to show/hide hotel rooms
            table.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    const hotelId = link.getAttribute("href").substring(1); // Remove the "#"
                    const hotelSection = document.getElementById(hotelId);
                    if (hotelSection.style.display === "none") {
                        hotelSection.style.display = "block";
                    } else {
                        hotelSection.style.display = "none";
                    }
                });
            });
        });

        console.log("Displayed " + hotels.length + " hotels.");

        // Use event delegation for book-now buttons
        resultsDiv.addEventListener("click", (e) => {
            if (e.target.classList.contains("book-now")) {
                const roomId = e.target.getAttribute("data-room-id");
                showBookingModal(roomId, checkIn, checkOut);
            }
        });
    }

    // Show booking modal with pre-filled data
    async function showBookingModal(roomId, checkIn, checkOut) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to book a room.");
            loginModal.show();
            return;
        }

        const modalCheckIn = document.getElementById("modalCheckIn");
        const modalCheckOut = document.getElementById("modalCheckOut");
        const roomIdInput = document.getElementById("roomId");
        const hotelNameInput = document.getElementById("hotelName");
        const roomCategoryInput = document.getElementById("roomCategory");

        // Populate hotel name and room category
        const room = allRooms.find(r => r.id == roomId);
        if (room) {
            hotelNameInput.value = room.hotel_name || "Unknown Hotel";
            roomCategoryInput.value = room.name || "Unknown Category";
        } else {
            hotelNameInput.value = "Unknown Hotel";
            roomCategoryInput.value = "Unknown Category";
        }

        modalCheckIn.value = checkIn || document.getElementById("checkIn").value;
        modalCheckOut.value = checkOut || document.getElementById("checkOut").value;
        roomIdInput.value = roomId;
        bookModal.show();
    }

    // Handle booking form submission
    bookForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const roomId = document.getElementById("roomId").value;
        const guestName = document.getElementById("guestName").value;
        const numberOfAdults = parseInt(document.getElementById("numberOfAdults").value);
        const numberOfChildren = parseInt(document.getElementById("numberOfChildren").value);
        const checkIn = document.getElementById("modalCheckIn").value;
        const checkOut = document.getElementById("modalCheckOut").value;
        const roomCount = parseInt(document.getElementById("roomCount").value);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/book", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token,
                },
                body: JSON.stringify({
                    room_id: parseInt(roomId),
                    guest_name: guestName,
                    number_of_adults: numberOfAdults,
                    number_of_children: numberOfChildren,
                    check_in: checkIn,
                    check_out: checkOut,
                    room_count: roomCount,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                alert("Booking successful! Total: ₹" + (data.total || "N/A"));
                bookModal.hide();
                if (lastSearch) {
                    await searchRooms(lastSearch.location, lastSearch.checkIn, lastSearch.checkOut);
                }
            } else {
                console.error("Booking failed:", data);
                alert("Booking failed: " + (data.error || "Unknown error") + " - " + (data.details || "No details available"));
            }
        } catch (error) {
            console.error("Error during booking:", error);
            alert("An error occurred during booking: " + error.message);
        }
    });

    // Show bookings modal and fetch bookings
    bookingsBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/bookings", {
                headers: { "Authorization": "Bearer " + token },
            });
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            const bookings = await response.json();
            console.log("Bookings received:", bookings);
            displayBookings(bookings);
            bookingsModal.show();
        } catch (error) {
            console.error("Error fetching bookings:", error);
            alert("Error fetching bookings: " + error.message);
        }
    });

    // Display user bookings
    function displayBookings(bookings) {
        if (!bookingList) {
            console.error("Booking list element not found");
            return;
        }
        console.log("Bookings to display:", bookings); // Debug log
        bookingList.innerHTML = "";

        if (!bookings || bookings.length === 0) {
            console.log("No bookings found to display");
            bookingList.innerHTML = "<p>No bookings found.</p>";
            return;
        }

        bookings.forEach((booking) => {
            console.log("Rendering booking:", booking); // Debug log
            const bookingCard = document.createElement("div");
            bookingCard.className = "booking-card card p-3 mb-3";
            bookingCard.innerHTML = [
                '<p><strong>Booking ID:</strong> ' + booking.id + '</p>',
                '<p><strong>Guest Name:</strong> ' + escapeHTML(booking.guest_name || "N/A") + '</p>',
                '<p><strong>Hotel:</strong> ' + escapeHTML(booking.rooms?.hotel_name || "Unknown Hotel") + '</p>',
                '<p><strong>Room:</strong> ' + escapeHTML(booking.rooms?.name || "Unknown Room") + '</p>',
                '<p><strong>Location:</strong> ' + escapeHTML(booking.rooms?.location || "Unknown Location") + '</p>',
                '<p><strong>Check-In:</strong> ' + booking.check_in + '</p>',
                '<p><strong>Check-Out:</strong> ' + booking.check_out + '</p>',
                '<p><strong>Number of Adults:</strong> ' + (booking.number_of_adults || 0) + '</p>',
                '<p><strong>Number of Children:</strong> ' + (booking.number_of_children || 0) + '</p>',
                '<p><strong>Number of Rooms:</strong> ' + booking.room_count + '</p>',
                '<p><strong>Total Price:</strong> ₹' + (booking.total_price || "N/A") + '</p>',
                '<button class="btn btn-primary download-slip-btn" data-booking-id="' + booking.id + '">Download Booking Slip</button>'
            ].join("");
            bookingList.appendChild(bookingCard);
        });

        // Use event delegation for download buttons
        bookingList.removeEventListener("click", handleDownloadClick); // Remove previous listener to avoid duplicates
        bookingList.addEventListener("click", handleDownloadClick);

        function handleDownloadClick(e) {
            if (e.target.classList.contains("download-slip-btn")) {
                const bookingId = e.target.getAttribute("data-booking-id");
                const booking = bookings.find(b => b.id == bookingId);
                if (booking) {
                    generateBookingSlip(booking);
                }
            }
        }
    }

    // Generate booking slip as PDF using jsPDF
    function generateBookingSlip(booking) {
        // Destructure jsPDF from the global window object
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Set font styles
        doc.setFontSize(20);
        doc.text("Booking Slip", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text("Hotel: " + (booking.rooms ? booking.rooms.hotel_name : "Unknown Hotel"), 105, 30, { align: "center" });
        doc.setFontSize(12);
        doc.text("Location: " + (booking.rooms ? booking.rooms.location : "Unknown Location"), 105, 35, { align: "center" });

        doc.setFontSize(16);
        doc.text("Booking Details", 20, 50);

        doc.setFontSize(12);
        let yPosition = 60;
        const lineHeight = 10;
        doc.text("Booking ID: " + booking.id, 20, yPosition);
        yPosition += lineHeight;
        doc.text("Guest Name: " + (booking.guest_name || "N/A"), 20, yPosition);
        yPosition += lineHeight;
        doc.text("Room Category: " + (booking.rooms ? booking.rooms.name : "Unknown Room"), 20, yPosition);
        yPosition += lineHeight;
        doc.text("Check-In Date: " + booking.check_in, 20, yPosition);
        yPosition += lineHeight;
        doc.text("Check-Out Date: " + booking.check_out, 20, yPosition);
        yPosition += lineHeight;
        doc.text("Number of Adults: " + (booking.number_of_adults || 0), 20, yPosition);
        yPosition += lineHeight;
        doc.text("Number of Children: " + (booking.number_of_children || 0), 20, yPosition);
        yPosition += lineHeight;
        doc.text("Number of Rooms: " + booking.room_count, 20, yPosition);
        yPosition += lineHeight;
        doc.text("Total Price: ₹" + (booking.total_price || "N/A"), 20, yPosition);

        yPosition += lineHeight * 2;
        doc.setFontSize(12);
        doc.text("Thank you for booking with us!", 105, yPosition, { align: "center" });

        // Add a footer
        doc.setFontSize(10);
        doc.text("Page 1", 105, 280, { align: "center" });

        // Download the PDF
        doc.save("BookingSlip_" + booking.id + ".pdf");
    }

    // Handle logout
    logoutBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        console.log("Token before logout request:", token);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/logout", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                },
            });

            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }

            const data = await response.json();
            console.log("Logged out successfully:", data);

            localStorage.removeItem("token");
            loginBtn.style.display = "block";
            logoutBtn.style.display = "none";
            bookingsBtn.style.display = "none";

            if (lastSearch) {
                await searchRooms(lastSearch.location, lastSearch.checkIn, lastSearch.checkOut);
            }
        } catch (error) {
            console.error("Error during logout:", error);
            localStorage.removeItem("token");
            loginBtn.style.display = "block";
            logoutBtn.style.display = "none";
            bookingsBtn.style.display = "none";
        }
    });
});