document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginModal = new bootstrap.Modal(document.getElementById("loginModal"));
    const searchForm = document.getElementById("searchForm");
    const loginForm = document.getElementById("loginForm");
    const checkInInput = document.getElementById("checkIn");
    const checkOutInput = document.getElementById("checkOut");
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

    async function checkSession() {
        const currentToken = localStorage.getItem("token");
        console.log("Checking session with token:", currentToken);
        try {
            const response = await fetch("https://hotel-backend-n0n6.onrender.com/check-session", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${currentToken}`,
                },
            });
            const data = await response.json();
            console.log("Check session response:", data);
            if (data.loggedIn) {
                loginBtn.style.display = "none";
                logoutBtn.style.display = "block";
                bookingsBtn.style.display = "block";
            } else {
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
            console.log("Login response:", data);
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

        const rowDiv = document.createElement("div");
        rowDiv.className = "row";

        rooms.forEach((room, index) => {
            try {
                const colDiv = document.createElement("div");
                colDiv.className = "col-md-4 mb-2"; // Changed mb-4 to mb-2

                const cardDiv = document.createElement("div");
                cardDiv.className = "card";

                cardDiv.innerHTML = `
                    <img src="${room.image}" class="card-img-top" alt="${room.name}">
                    <div class="card-body">
                        <h5 class="card-title">${room.name}</h5>
                        <p class="card-text">Hotel: ${room.hotel_name}</p>
                        <p class="card-text">Location: ${room.location}</p>
                        <p class="card-text">Price: ₹${room.price} per night</p>
                        <p class="card-text">Available Rooms: ${room.available}</p>
                        <p class="card-text">Amenities: ${
                            Array.isArray(room.amenities) ? room.amenities.join(", ") : room.amenities || "None"
                        }</p>
                        <button class="btn btn-primary book-now" data-room-id="${room.id}">Book Now</button>
                    </div>
                `;

                colDiv.appendChild(cardDiv);
                rowDiv.appendChild(colDiv);
            } catch (error) {
                console.error(`Error rendering room ${room.id}:`, error);
            }
        });

        resultsDiv.appendChild(rowDiv);
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
                    roomId: parseInt(roomId),
                    checkIn,
                    checkOut,
                    roomCount,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Booking successful! Total: ₹${data.total}`);
                bookModal.hide();
                searchRooms(lastSearch.location, lastSearch.checkIn, lastSearch.checkOut);
            } else {
                alert(data.error || "Booking failed");
            }
        } catch (error) {
            console.error("Error during booking:", error);
            alert("An error occurred during booking");
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

            const bookings = await response.json();
            bookingsTable.innerHTML = "";

            if (bookings.length === 0) {
                bookingsTable.innerHTML = "<tr><td colspan='7'>No bookings found.</td></tr>";
            } else {
                bookings.forEach(booking => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${booking.id}</td>
                        <td>${booking.hotel_name} - ${booking.name}</td>
                        <td>${booking.location}</td>
                        <td>${booking.check_in}</td>
                        <td>${booking.check_out}</td>
                        <td>${booking.room_count}</td>
                        <td>₹${booking.total_price}</td>
                    `;
                    bookingsTable.appendChild(row);
                });
            }

            bookingsModal.show();
        } catch (error) {
            console.error("Error fetching bookings:", error);
            alert("Error fetching bookings");
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
            console.log(data.message);

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