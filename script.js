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

    // Autocomplete for location input
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

    // Fetch and display rooms
    async function searchRooms(location, checkIn, checkOut) {
        console.log("Fetching rooms from /rooms with location: " + location);
        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/rooms?location=" + encodeURIComponent(location));
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            allRooms = await response.json();
            console.log("Rooms received:", allRooms);
            displayRooms(allRooms, checkIn, checkOut);
        } catch (error) {
            console.error("Error fetching rooms:", error);
            document.getElementById("results").innerHTML = "<p>Error fetching rooms. Please try again later.</p>";
        }
    }

    // Display rooms in the UI
    function displayRooms(rooms, checkIn, checkOut) {
        const resultsDiv = document.getElementById("results");
        if (!resultsDiv) {
            console.error("Results div not found");
            return;
        }
        resultsDiv.innerHTML = "";

        if (!rooms || rooms.length === 0) {
            resultsDiv.innerHTML = "<p>No rooms to display.</p>";
            console.log("No rooms to display.");
            return;
        }

        console.log("Sample room data:", rooms[0]);

        const roomTypeOrder = { "Standard": 1, "Deluxe": 2, "Suite": 3 };

        const groupedRooms = rooms.reduce((acc, room) => {
            const hotelName = room.hotel_name || room.hotel || "Unknown Hotel";
            if (!acc[hotelName]) {
                acc[hotelName] = [];
            }
            acc[hotelName].push(room);
            return acc;
        }, {});

        const sortedHotels = Object.keys(groupedRooms).sort();

        sortedHotels.forEach(hotelName => {
            const hotelRooms = groupedRooms[hotelName];

            hotelRooms.sort((a, b) => {
                const orderA = roomTypeOrder[a.name] || 999;
                const orderB = roomTypeOrder[b.name] || 999;
                return orderA - orderB;
            });

            const hotelSection = document.createElement("div");
            hotelSection.className = "mb-4";

            const hotelHeading = document.createElement("h3");
            hotelHeading.className = "text-white mb-3";
            hotelHeading.textContent = hotelName;
            hotelSection.appendChild(hotelHeading);

            const rowDiv = document.createElement("div");
            rowDiv.className = "row";

            hotelRooms.forEach((room, index) => {
                try {
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
                        '<img src="' + room.image + '" class="card-img-top" alt="' + room.name + '">',
                        '<div class="card-body">',
                        '<h5 class="card-title">' + room.name + '</h5>',
                        '<p class="card-text">Location: ' + room.location + '</p>',
                        '<p class="card-text">Price: ₹' + room.price + ' per night</p>',
                        '<p class="card-text">Available Rooms: ' + room.available + '</p>',
                        '<p class="card-text">Amenities: ' + amenitiesText + '</p>',
                        '<button class="btn btn-primary book-now" data-room-id="' + room.id + '">Book Now</button>',
                        '</div>'
                    ].join("");

                    colDiv.appendChild(cardDiv);
                    rowDiv.appendChild(colDiv);
                } catch (error) {
                    console.error("Error rendering room " + room.id + ":", error);
                }
            });

            hotelSection.appendChild(rowDiv);
            resultsDiv.appendChild(hotelSection);
        });

        console.log("Displayed " + rooms.length + " rooms.");

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
        bookingList.innerHTML = "";

        if (!bookings || bookings.length === 0) {
            bookingList.innerHTML = "<p>No bookings found.</p>";
            return;
        }

        bookings.forEach((booking) => {
            const bookingCard = document.createElement("div");
            bookingCard.className = "booking-card card p-3 mb-3";
            bookingCard.innerHTML = [
                '<p><strong>Booking ID:</strong> ' + booking.id + '</p>',
                '<p><strong>Guest Name:</strong> ' + (booking.guest_name || "N/A") + '</p>',
                '<p><strong>Hotel:</strong> ' + (booking.rooms.hotel_name || "Unknown Hotel") + '</p>',
                '<p><strong>Room:</strong> ' + (booking.rooms.name || "Unknown Room") + '</p>',
                '<p><strong>Location:</strong> ' + (booking.rooms.location || "Unknown Location") + '</p>',
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

    // Generate booking slip as PDF
    function generateBookingSlip(booking) {
        // Escape LaTeX special characters
        function escapeLatex(str) {
            if (typeof str !== "string") return "N/A";
            return str
                .replace(/&/g, "\\&")
                .replace(/%/g, "\\%")
                .replace(/#/g, "\\#")
                .replace(/_/g, "\\_")
                .replace(/{/g, "\\{")
                .replace(/}/g, "\\}");
        }

        // Use fallbacks to prevent undefined errors
        const hotelName = escapeLatex(booking.rooms ? booking.rooms.hotel_name : "Unknown Hotel");
        const location = escapeLatex(booking.rooms ? booking.rooms.location : "Unknown Location");
        const guestName = escapeLatex(booking.guest_name || "N/A");
        const roomName = escapeLatex(booking.rooms ? booking.rooms.name : "Unknown Room");
        const checkIn = escapeLatex(booking.check_in || "N/A");
        const checkOut = escapeLatex(booking.check_out || "N/A");
        const numberOfAdults = booking.number_of_adults != null ? booking.number_of_adults : 0;
        const numberOfChildren = booking.number_of_children != null ? booking.number_of_children : 0;
        const roomCount = booking.room_count != null ? booking.room_count : 0;
        const totalPrice = booking.total_price != null ? booking.total_price : "N/A";

        // Construct LaTeX content using an array to avoid parsing issues
        const latexContent = [
            "\\documentclass{article}",
            "\\usepackage{geometry}",
            "\\geometry{a4paper, margin=1in}",
            "\\usepackage{graphicx}",
            "\\usepackage{fancyhdr}",
            "\\usepackage{xcolor}",
            "",
            "\\pagestyle{fancy}",
            "\\fancyhf{}",
            "\\fancyhead[C]{\\textbf{Hotel Booking Slip}}",
            "\\fancyfoot[C]{\\thepage}",
            "",
            "\\begin{document}",
            "",
            "\\begin{center}",
            "    \\LARGE{\\textbf{Booking Slip}}\\\\",
            "    \\vspace{0.5cm}",
            "    \\large{Hotel: " + hotelName + "}\\\\",
            "    \\vspace{0.2cm}",
            "    \\normalsize{Location: " + location + "}",
            "\\end{center}",
            "",
            "\\vspace{1cm}",
            "",
            "\\section*{Booking Details}",
            "\\begin{itemize}",
            "    \\item \\textbf{Booking ID:} " + booking.id,
            "    \\item \\textbf{Guest Name:} " + guestName,
            "    \\item \\textbf{Room Category:} " + roomName,
            "    \\item \\textbf{Check-In Date:} " + checkIn,
            "    \\item \\textbf{Check-Out Date:} " + checkOut,
            "    \\item \\textbf{Number of Adults:} " + numberOfAdults,
            "    \\item \\textbf{Number of Children:} " + numberOfChildren,
            "    \\item \\textbf{Number of Rooms:} " + roomCount,
            "    \\item \\textbf{Total Price:} ₹" + totalPrice,
            "\\end{itemize}",
            "",
            "\\vspace{1cm}",
            "",
            "\\begin{center}",
            "    \\normalsize{Thank you for booking with us!}",
            "\\end{center}",
            "",
            "\\end{document}"
        ].join("\n");

        // Log the LaTeX content for debugging
        console.log("LaTeX Content for Booking Slip:\n" + latexContent);

        // Alert the user on how to generate the PDF manually
        alert(
            "Booking slip LaTeX content has been generated. Check the console for the LaTeX code. " +
            "To create a PDF, copy the LaTeX content, save it as 'booking.tex', and compile it using a LaTeX compiler like pdflatex."
        );
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