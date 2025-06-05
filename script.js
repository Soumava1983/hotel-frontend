let lastSearch = null;
let isLoggedIn = false;

// Define the backend URL
const BACKEND_URL = "https://hotel-backend-n0n6.onrender.com";

document.addEventListener('DOMContentLoaded', async () => {
    await checkSession();
    // Other initialization code...
});

async function checkSession() {
    try {
        const token = localStorage.getItem('token') || 'null';
        const response = await fetch(`${BACKEND_URL}/check-session`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const bookingHistorySection = document.getElementById("booking-history-section");

        if (!loginBtn || !logoutBtn) {
            console.warn('Login or logout button not found in the DOM. Ensure elements with id="login-btn" and id="logout-btn" exist on this page.');
            return;
        }
        if (!bookingHistorySection) {
            console.warn('Booking history section not found in the DOM. Ensure an element with id="booking-history-section" exists.');
        }

        if (data.loggedIn) {
            isLoggedIn = true;
            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";
            if (bookingHistorySection) {
                bookingHistorySection.style.display = "block";
            }
            // Refresh room display to enable booking buttons
            if (lastSearch) {
                const rooms = await loadRooms(lastSearch.location);
                displayRooms(rooms, lastSearch.checkIn, lastSearch.checkOut);
            }
        } else {
            isLoggedIn = false;
            loginBtn.style.display = "inline-block";
            logoutBtn.style.display = "none";
            if (bookingHistorySection) {
                bookingHistorySection.style.display = "none";
            }
            // Refresh room display to disable booking buttons
            if (lastSearch) {
                const rooms = await loadRooms(lastSearch.location);
                displayRooms(rooms, lastSearch.checkIn, lastSearch.checkOut);
            }
        }
    } catch (error) {
        console.error('Error checking session:', error);
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const bookingHistorySection = document.getElementById("booking-history-section");

        if (!loginBtn || !logoutBtn) {
            console.warn('Login or logout button not found in the DOM during error handling.');
            return;
        }
        if (!bookingHistorySection) {
            console.warn('Booking history section not found in the DOM during error handling.');
        }

        isLoggedIn = false;
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        if (bookingHistorySection) {
            bookingHistorySection.style.display = "none";
        }
        // Refresh room display to disable booking buttons
        if (lastSearch) {
            const rooms = await loadRooms(lastSearch.location);
            displayRooms(rooms, lastSearch.checkIn, lastSearch.checkOut);
        }
    }
}

function setupLoginButton() {
    const loginBtn = document.getElementById("login-btn");
    const loginForm = document.getElementById("login-form");
    if (loginBtn && loginForm) {
        loginBtn.addEventListener("click", () => {
            loginForm.style.display = loginForm.style.display === "block" ? "none" : "block";
        });
    }
}

const loginFormElement = document.getElementById("login-form-element");
if (loginFormElement) {
    loginFormElement.addEventListener("submit", async function(event) {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("token", data.token);
                alert("Login successful!");
                await checkSession();
            } else {
                throw new Error(data.error || "Login failed");
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert(error.message);
        }
    });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}

const searchForm = document.getElementById("search-form");
searchForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    const location = document.getElementById("location").value.toLowerCase().trim();
    const checkIn = document.getElementById("check-in").value;
    const checkOut = document.getElementById("check-out").value;

    if (!location || !checkIn || !checkOut) {
        alert("Please fill in all fields.");
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (checkIn < today || checkOut <= checkIn) {
        alert("Invalid dates. Check-in must be today or later, and check-out must be after check-in.");
        return;
    }

    lastSearch = { location, checkIn, checkOut };
    console.log("lastSearch updated on form submit:", lastSearch);

    const rooms = await loadRooms(location);
    displayRooms(rooms, checkIn, checkOut);

    const bookingsList = document.getElementById("bookings-list");
    if (bookingsList) {
        bookingsList.innerHTML = "";
    }
});

async function loadRooms(location) {
    try {
        console.log("Fetching rooms from /rooms with location:", location);
        const capitalizedLocation = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
        const url = capitalizedLocation
            ? `${BACKEND_URL}/rooms?location=${encodeURIComponent(capitalizedLocation)}`
            : `${BACKEND_URL}/rooms`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch rooms: ${response.statusText} (Status: ${response.status})`);
        }
        const rooms = await response.json();
        console.log("Rooms received:", rooms);
        return rooms;
    } catch (error) {
        console.error("Error fetching rooms:", error);
        alert("Couldn’t load rooms. Please try again later.");
        return [];
    }
}

function displayRooms(rooms, checkIn, checkOut) {
    const roomList = document.getElementById("room-list");
    if (!roomList) {
        console.error("Room list element not found in the DOM.");
        return;
    }
    roomList.innerHTML = "";

    if (rooms.length === 0) {
        roomList.innerHTML = "<p>No rooms available for this location.</p>";
        console.log("No rooms to display.");
        return;
    }

    const groupedRooms = rooms.reduce((acc, room) => {
        const hotelName = room.hotel_name;
        if (!acc[hotelName]) {
            acc[hotelName] = [];
        }
        acc[hotelName].push(room);
        return acc;
    }, {});

    Object.keys(groupedRooms).forEach(hotelName => {
        const hotelSection = document.createElement("div");
        hotelSection.classList.add("hotel-section");

        const hotelHeader = document.createElement("h2");
        hotelHeader.textContent = hotelName;
        hotelSection.appendChild(hotelHeader);

        const roomsContainer = document.createElement("div");
        roomsContainer.classList.add("rooms-container");

        groupedRooms[hotelName].forEach(room => {
            try {
                const roomCard = document.createElement("div");
                roomCard.classList.add("room-card");
                roomCard.innerHTML = `
                    <img src="${room.image}" alt="${room.name}">
                    <div class="room-details">
                        <h3>${room.name}</h3>
                        <p>Location: ${room.location}</p>
                        <p>Price: ₹${room.price}/night</p>
                        <p>Rooms Available: ${room.available}</p>
                        <p>Amenities: ${room.amenities.join(", ") || "None"}</p>
                        <div class="book-section">
                            <button class="book-btn" data-room-id="${room.id}" ${!isLoggedIn ? 'disabled' : ''}>Book Now</button>
                            ${!isLoggedIn ? '<span class="tooltip">Please log in to book</span>' : ''}
                            <input type="number" class="room-count" min="1" max="${room.available}" value="1" ${!isLoggedIn ? 'disabled' : ''}>
                            <label>Rooms to Book</label>
                        </div>
                    </div>
                `;
                roomsContainer.appendChild(roomCard);

                const bookBtn = roomCard.querySelector(".book-btn");
                if (isLoggedIn) {
                    bookBtn.addEventListener("click", async () => {
                        const roomCount = parseInt(roomCard.querySelector(".room-count").value, 10);
                        if (roomCount < 1 || roomCount > room.available) {
                            alert(`Please select a valid number of rooms (1 to ${room.available}).`);
                            return;
                        }
                        try {
                            const token = localStorage.getItem("token");
                            const headers = { "Content-Type": "application/json" };
                            if (token && token !== "null") {
                                headers["Authorization"] = `Bearer ${token}`;
                            }
                            const response = await fetch(`${BACKEND_URL}/book`, {
                                method: "POST",
                                headers: headers,
                                body: JSON.stringify({ roomId: room.id, checkIn, checkOut, roomCount })
                            });
                            const data = await response.json();
                            if (response.ok) {
                                alert(`Booking successful! Total: ₹${data.total}`);
                                const updatedRooms = await loadRooms(lastSearch.location);
                                displayRooms(updatedRooms, checkIn, checkOut);
                            } else {
                                throw new Error(data.error || "Booking failed");
                            }
                        } catch (error) {
                            alert(error.message);
                        }
                    });
                }
            } catch (error) {
                console.error(`Error rendering room ${room.id}:`, error);
            }
        });

        hotelSection.appendChild(roomsContainer);
        roomList.appendChild(hotelSection);
    });

    console.log(`Displayed ${rooms.length} rooms.`);
}

const viewBookingsBtn = document.getElementById("view-bookings");
if (viewBookingsBtn) {
    viewBookingsBtn.addEventListener("click", async function() {
        try {
            console.log("Fetching bookings from /bookings...");
            const token = localStorage.getItem("token");
            const headers = {};
            if (token && token !== "null") {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const response = await fetch(`${BACKEND_URL}/bookings`, {
                method: "GET",
                headers: headers
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch bookings: ${response.statusText} (Status: ${response.status})`);
            }
            const bookings = await response.json();
            console.log("Bookings received:", bookings);
            displayBookings(bookings);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            alert("Couldn’t load booking history. Please try again later.");
        }
    });
}

function displayBookings(bookings) {
    const bookingsList = document.getElementById("bookings-list");
    if (!bookingsList) {
        console.error("Bookings list element not found in the DOM.");
        return;
    }
    bookingsList.innerHTML = "";

    if (bookings.length === 0) {
        bookingsList.innerHTML = "<p>No bookings found.</p>";
        console.log("No bookings to display.");
        return;
    }

    bookings.forEach(booking => {
        try {
            const bookingCard = document.createElement("div");
            bookingCard.classList.add("booking-card");
            bookingCard.innerHTML = `
                <h3>${booking.name} at ${booking.hotel_name}</h3>
                <p>Location: ${booking.location}</p>
                <p>Check-In: ${booking.check_in}</p>
                <p>Check-Out: ${booking.check_out}</p>
                <p>Booked On: ${new Date(booking.booking_date).toLocaleString()}</p>
                <p>Number of Rooms: ${booking.room_count}</p>
                <p>Total: ₹${booking.total_price}</p>
                <p>Amenities: ${booking.amenities.join(", ") || "None"}</p>
            `;
            bookingsList.appendChild(bookingCard);
        } catch (error) {
            console.error(`Error rendering booking ${booking.id}:`, error);
        }
    });
    console.log(`Displayed ${bookings.length} bookings.`);
}

async function logout() {
    try {
        const token = localStorage.getItem("token");
        console.log("Token before logout request:", token);
        if (!token || token === "null") {
            console.log("No token found, proceeding with client-side logout");
        } else {
            const response = await fetch(`${BACKEND_URL}/logout`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
                }
            });
            if (!response.ok) {
                throw new Error(`Logout failed: ${response.statusText} (Status: ${response.status})`);
            }
            const data = await response.json();
            console.log(data.message);
        }

        // Clear client-side token and update UI
        localStorage.removeItem("token");
        isLoggedIn = false;
        const loginForm = document.getElementById("login-form");
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const bookingHistorySection = document.getElementById("booking-history-section");
        if (loginForm) loginForm.style.display = "none";
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (bookingHistorySection) bookingHistorySection.style.display = "none";
        alert("Logged out successfully!");

        if (lastSearch) {
            const rooms = await loadRooms(lastSearch.location);
            displayRooms(rooms, lastSearch.checkIn, lastSearch.checkOut);
        }
    } catch (error) {
        console.error("Error logging out:", error);
        // Proceed with client-side logout even if the server request fails
        localStorage.removeItem("token");
        isLoggedIn = false;
        const loginForm = document.getElementById("login-form");
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const bookingHistorySection = document.getElementById("booking-history-section");
        if (loginForm) loginForm.style.display = "none";
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (bookingHistorySection) bookingHistorySection.style.display = "none";
        alert("Logged out successfully!");

        if (lastSearch) {
            const rooms = await loadRooms(lastSearch.location);
            displayRooms(rooms, lastSearch.checkIn, lastSearch.checkOut);
        }
    }
}

// Call setupLoginButton after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupLoginButton();
});