document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const searchFilter = document.getElementById("search-filter");

  let allActivities = {};
  let categories = new Set();

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      categories = new Set();
      // Collect categories (if present, else fallback to 'General')
      Object.values(activities).forEach((details) => {
        if (details.category) {
          categories.add(details.category);
        } else {
          categories.add("General");
        }
      });
      renderCategoryOptions();
      renderActivities();
      renderActivitySelect();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderCategoryOptions() {
    if (!categoryFilter) return;
    // Clear existing options
    categoryFilter.innerHTML = '';

    // Add "All" option
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    categoryFilter.appendChild(allOption);

    // Add options for each category
    Array.from(categories).forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
  }

  function renderActivities() {
    let filtered = Object.entries(allActivities);
    // Filter by category
    const selectedCategory = categoryFilter?.value;
    if (selectedCategory) {
      filtered = filtered.filter(([, details]) =>
        (details.category || "General") === selectedCategory
      );
    }
    // Search filter
    const search = searchFilter?.value?.toLowerCase() || "";
    if (search) {
      filtered = filtered.filter(([name, details]) =>
        name.toLowerCase().includes(search) ||
        (details.description && details.description.toLowerCase().includes(search))
      );
    }
    // Sort
    const sortBy = sortFilter?.value || "name";
    if (sortBy === "name") {
      filtered.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortBy === "time") {
      // Prefer date field if available, else fallback to schedule string
      filtered.sort((a, b) => {
        if (a[1].date && b[1].date) {
          return a[1].date.localeCompare(b[1].date);
        }
        return (a[1].schedule || "").localeCompare(b[1].schedule || "");
      });
    }
    // Render
    activitiesList.innerHTML = "";
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Category:</strong> ${details.category || "General"}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Date:</strong> ${details.date || "N/A"}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function renderActivitySelect() {
    if (!activitySelect) return;
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(allActivities).forEach((name) => {
      activitySelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
  }

  // Add event listeners for filters
  if (categoryFilter) categoryFilter.addEventListener("change", renderActivities);
  if (sortFilter) sortFilter.addEventListener("change", renderActivities);
  if (searchFilter) searchFilter.addEventListener("input", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
