// ================================
// community.js
// ================================
// Loads services and posts for the community page,
// populates filter dropdowns, applies filters, and renders posts.
// Compatible with constants.js / populateforms.js
// ================================

// Account for post types holding different information
function parsePost(raw) {
  const type = raw.post?.type || "update";

  const base = {
    type: type,
    title: raw.post?.title || "Untitled",
    message: raw.post?.message || "",
    date: raw.post?.date || null,
    expiresDate: raw.post?.expiresDate || null,
    contactInfo: raw.post?.contactInfo || "",
    foodBankId: raw.organization?.foodBankId || "fb0",
    orgOther: raw.organization?.foodBankOther || "",
    location: raw.location?.location || null,
    rawData: raw // keep original for type-specific access
  };

  // Add type-specific fields
  switch(type) {
    case "recurring_event":
      base.recurringDates = raw.recurringEvent?.recurringDates || "";
      base.startRecurringDates = raw.recurringEvent?.startRecurringDates || null;
      break;

    case "event":
      base.eventDate = raw.uniqueEvent?.eventDate || null;
      break;

    case "food_available":
      base.timeWindow = raw.food?.timeWindow || "";
      base.availableItems = raw.food?.availableItems || "";
      break;

    // For 'update' and 'urgent', no extra fields needed (at this time, but can edit later)
  }

  return base;
}


let allPosts = [];
let services = [];


// --------------------
// Populate dynamic Services dropdown (filterOrganization)
// --------------------
function populateServicesDropdown(servicesList) {
    const select = document.getElementById("filterOrganization");
    if (!select) return;
    // Reset with default option
    select.innerHTML = `<option value="">All Organizations</option>`;
    // Sort alphabetically
    servicesList.sort((a,b)=> a.name.localeCompare(b.name))
        .forEach(service => {
            const option = document.createElement("option");
            option.value = service.id;
            option.textContent = service.name;
            select.appendChild(option);
        });
}

// --------------------
// Load services.json and populate filter
// --------------------
async function loadServices() {
    try {
        const response = await fetch("data/services.json");
        services = await response.json();
        populateServicesDropdown(services);
    } catch (err) {
        console.error("❌ Error loading services:", err);
    }
}

// --------------------
// Load posts from GitHub API
// --------------------
async function loadPosts() {
    console.log("🔄 Starting to load posts...");
    try {
        const repoOwner = "TogetherKGO";
        const repoName = "TogetherKGO";
        const branch = "main";
        const postsPath = "data/posts";

        const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${postsPath}?ref=${branch}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.warn("❌ No posts found or error accessing posts folder");
            displayPosts([]);
            document.getElementById("loading").style.display = "none";
            return;
        }

        const files = await response.json();
        const jsonFiles = files.filter(file => file.name.endsWith(".json"));

        const postPromises = jsonFiles.map(async file => {
            try {
                const postResponse = await fetch(file.download_url);
                const post = await postResponse.json();
                return post;
            } catch (err) {
                console.error(`❌ Error loading post ${file.name}:`, err);
                return null;
            }
        });

        allPosts = (await Promise.all(postPromises))
        .filter(p => p !== null)
        .map(parsePost);

        // Filter expired posts
        allPosts = allPosts.filter(post => !post.expiresDate || new Date(post.expiresDate) > new Date());

        // Sort newest first
        allPosts.sort((a,b) => new Date(b.date) - new Date(a.date));

        displayPosts(allPosts);
        document.getElementById("loading").style.display = "none";

    } catch (err) {
        console.error("❌ Error loading posts:", err);
        displayPosts([]);
        document.getElementById("loading").style.display = "none";
    }
}

// --------------------
// Display posts in grid
// --------------------
function displayPosts(posts) {
  const grid = document.getElementById("postsGrid");
  const noPosts = document.getElementById("noPosts");

  if (!grid) return;

  if (!posts.length) {
    grid.style.display = "none";
    noPosts.style.display = "block";
    return;
  }

  grid.innerHTML = "";
  grid.style.display = "grid";
  noPosts.style.display = "none";

  posts.forEach(post => {
    const service = services.find(s => s.id === post.foodBankId);
    const orgName = post.foodBankId === "fb0" ? post.orgOther : (service ? service.name : "Unknown Organization");

    const dateText = post.date ? new Date(post.date).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric"}) : "Date not available";

    let html = `
      <div class="post-header">
        <div>
          <h3 class="post-title">${post.title}</h3>
          <div class="post-meta">
            <span class="post-location">${orgName}</span>
            <span>•</span>
            <span>${dateText}</span>
          </div>
        </div>
        <span class="post-type ${post.type}">${getTypeLabel(post.type)}</span>
      </div>
      <p class="post-message">${post.message}</p>
    `;

    // Add type-specific info
    if (post.type === "recurring_event" && post.recurringDates) {
      html += `<div class="post-recurring">📅 Recurs: ${post.recurringDates}</div>`;
    }

    if (post.type === "event" && post.eventDate) {
      html += `<div class="post-event-date">📅 Event Date: ${new Date(post.eventDate).toLocaleString()}</div>`;
    }

    if (post.type === "food_available") {
      if (post.timeWindow) html += `<div>🕒 Time: ${post.timeWindow}</div>`;
      if (post.availableItems) html += `<div>🍎 Available: ${post.availableItems}</div>`;
    }

    if (post.contactInfo) {
      html += `<div class="post-contact">📞 Contact: ${post.contactInfo}</div>`;
    }

    const card = document.createElement("div");
    card.className = `post-card ${post.type}`;
    card.dataset.orgType = service ? service.type : "organization";
    card.innerHTML = html;

    grid.appendChild(card);
  });
}

// --------------------
// Using the constants
// --------------------
function getTypeLabel(type) {
  return CONSTANTS.UPDATE_TYPES[type] || "Update";
}

// --------------------
// Filter posts based on dropdowns
// --------------------
function filterPosts() {
    const orgFilter = document.getElementById("filterOrganization")?.value;
    const orgTypeFilter = document.getElementById("orgType")?.value;
    const postTypeFilter = document.getElementById("postType")?.value;

    let filtered = [...allPosts]; // clone original posts

    // Filter by organization
    if (orgFilter) {
        filtered = filtered.filter(p => p.foodBankId === orgFilter);
    }

    // Filter by organization type
    console.log("Testing" + orgTypeFilter)
    if (orgTypeFilter) {
        filtered = filtered.filter(p => {
            if (p.foodBankId === "fb0") {
                // For "Other" organizations
                return orgTypeFilter === "Individual";  
            }
            const service = services.find(s => s.id === p.foodBankId); //
            //service?.type"type": "community_org" -> CONST to front end.
            return service?.type === orgTypeFilter;
        });
    }

    // Filter by post type
    if (postTypeFilter) {
        filtered = filtered.filter(p => p.type === postTypeFilter);
    }

    displayPosts(filtered);
}

// --------------------
// Event listeners for filters
// --------------------
function setupFilters() {
    ["filterOrganization", "filterOrgType", "filterPostType"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", filterPosts);
    });
}

// --------------------
// Initialization
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Initializing Community Page");

    setupFilters();              // Setup filter event listeners
    await loadServices();         // Load dynamic services dropdown
    await loadPosts();            // Load posts after services are loaded
});