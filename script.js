document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const registerFromLoginBtn = document.getElementById("registerFromLoginBtn");
    const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
    const registerModal = new bootstrap.Modal(document.getElementById("registerModal"));
    const searchForm = document.getElementById("searchForm");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
    const locationInput = document.getElementById("location");
    const bookModalElement = document.getElementById("bookModal");
    const bookModal = new bootstrap.Modal(bookModalElement);
    const bookForm = document.getElementById("bookForm");
    const bookingsBtn = document.getElementById("bookingsBtn");
    const bookingsModal = new bootstrap.Modal(document.getElementById("bookingsModal"));
    const bookingsTable = document.getElementById("bookingsTable").querySelector("tbody");

    let lastSearch = JSON.parse(localStorage.getItem("lastSearch")) || null;

    const today = new Date().toISOString().split("T")[0];
    checkInInput.setAttribute("min", today);
    checkOutInput.setAttribute("min", today);

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

    // Autocomplete for location input
    async function fetchLocations() {
        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/rooms");
            const rooms = await response.json();
            const locations = [...new Set(rooms.map(room => room.location))].sort();
            return locations;
        } catch (error) {
            console.error("Error fetching locations for autocomplete:", error);
            return [];
        }
    }

    locationInput.addEventListener("input", async () => {
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
    });

    function removeDatalist() {
        const existingDatalist = document.getElementById("locationSuggestions");
        if (existingDatalist) {
            existingDatalist.remove();
        }
        locationInput.removeAttribute("list");
    }

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
                    "Authorization": `Bearer ${currentToken}`,
                    "Content-Type": "application/json", // Added for clarity
                },
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP error ${response.status}: ${text}`);
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

    if (lastSearch) {
        document.getElementById("location").value = lastSearch.location;
        document.getElementById("checkIn").value = lastSearch.checkIn;
        document.getElementById("checkOut").value = lastSearch.checkOut;
    }

    loginBtn.addEventListener("click", () => {
        loginModal.show();
    });

    registerFromLoginBtn.addEventListener("click", () => {
        loginModal.hide();
        registerModal.show();
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        console.log(`Attempting login with email: ${email}`);

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
                checkSession();
            } else {
                alert(data.error || "Login failed");
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert("An error occurred during login");
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Register form submitted");
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        console.log(`Attempting registration with email: ${email}`);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log("Register response:", JSON.stringify(data, null, 2));
            if (response.ok) {
                alert("Registration successful! Please log in.");
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

    async function searchRooms(location, checkIn, checkOut) {
        console.log(`Fetching rooms from /rooms with location: ${location}`);
        try {
            const response = await fetch(`https://hotel-backend-n0n6.onrender.com/rooms?location=${encodeURIComponent(location)}`);
            const rooms = await response.json();
            console.log("Rooms received:", rooms);
            displayRooms(rooms, checkIn, checkOut);
        } catch (error) {
            console.error("Error fetching rooms:", error);
            document.getElementById("results").innerHTML = "<p>Error fetching rooms. Please try again later.</p>";
        }
    }

    function displayRooms(rooms, checkIn, checkOut) {
        const resultsDiv = document.getElementById("results");
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

                    const amenitiesText = typeof room.amenities === 'string' && room.amenities.trim() !== ''
                        ? room.amenities
                        : Array.isArray(room.amenities) && room.amenities.length > 0
                        ? room.amenities.join(", ")
                        : "None";

                    cardDiv.innerHTML = `
                        <img src="${room.image}" class="card-img-top" alt="${room.name}">
                        <div class="card-body">
                            <h5 class="card-title">${room.name}</h5>
                            <p class="card-text">Location: ${room.location}</p>
                            <p class="card-text">Price: ₹${room.price} per night</p>
                            <p class="card-text">Available Rooms: ${room.available}</p>
                            <p class="card-text">Amenities: ${amenitiesText}</p>
                            <button class="btn btn-primary book-now" data-room-id="${room.id}">Book Now</button>
                        </div>
                    `;

                    colDiv.appendChild(cardDiv);
                    rowDiv.appendChild(colDiv);
                } catch (error) {
                    console.error(`Error rendering room ${room.id}:`, error);
                }
            });

            hotelSection.appendChild(rowDiv);
            resultsDiv.appendChild(hotelSection);
        });

        console.log(`Displayed ${rooms.length} rooms.`);

        document.querySelectorAll(".book-now").forEach(button => {
            button.addEventListener("click", (e) => {
                const roomId = e.target.getAttribute("data-room-id");
                showBookingModal(roomId, checkIn, checkOut);
            });
        });
    }

    function showBookingModal(roomId, checkIn, checkOut) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to book a room.");
            loginModal.show();
            return;
        }

        document.getElementById("roomId").value = roomId;
        document.getElementById("modalCheckIn").value = checkIn || document.getElementById("checkIn").value;
        document.getElementById("modalCheckOut").value = checkOut || document.getElementById("checkOut").value;
        bookModal.show();
    }

bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const roomId = document.getElementById("roomId").value;
    const checkIn = document.getElementById("modalCheckIn").value;
    const checkOut = document.getElementById("modalCheckOut").value;
    const roomCount = parseInt(document.getElementById("roomCount").value);

    try {
        const response = await fetch("https://hotel-backend-n0n6.onrender.com/book", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                room_id: parseInt(roomId),
                check_in: checkIn,
                check_out: checkOut,
                room_count: roomCount, // Include room_count
            }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Booking successful! Total: ₹${data.total || 'N/A'}`); // Handle missing total
            bookModal.hide();
            searchRooms(lastSearch.location, lastSearch.checkIn, lastSearch.checkOut);
        } else {
            console.error('Booking failed:', data.error);
            alert(data.error || "Booking failed");
        }
    } catch (error) {
        console.error("Error during booking:", error);
        alert("An error occurred during booking: " + error.message);
    }
});

bookingsBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("https://hotel-backend-n0n6.onrender.com/bookings", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch bookings");
        }

        console.log("Bookings received:", data); // Add logging
        const bookings = Array.isArray(data) ? data : [];
        bookingsTable.innerHTML = "";

        if (bookings.length === 0) {
            bookingsTable.innerHTML = "<tr><td colspan='7'>No bookings found.</td></tr>";
        } else {
            bookings.forEach(booking => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${booking.id}</td>
                    <td>${booking.rooms.hotel_name} - ${booking.rooms.name}</td>
                    <td>${booking.rooms.location}</td>
                    <td>${booking.check_in}</td>
                    <td>${booking.check_out}</td>
                    <td>${booking.room_count || 'N/A'}</td>
                    <td>₹${booking.total_price || 'N/A'}</td>
                `;
                bookingsTable.appendChild(row);
            });
        }

        bookingsModal.show();
    } catch (error) {
        console.error("Error fetching bookings:", error);
        alert("Error fetching bookings: " + error.message);
    }
});

    logoutBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        console.log("Token before logout request:", token);

        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await response.json();
            console.log("Logged out successfully");

            localStorage.removeItem("token");
            loginBtn.style.display = "block";
            logoutBtn.style.display = "none";
            bookingsBtn.style.display = "none";

            if (lastSearch) {
                searchRooms(lastSearch.location, lastSearch.checkIn, lastSearch.checkOut);
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