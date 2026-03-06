// ================================
// community.js
// ================================
// Loads services and posts for the community page,
// populates filter dropdowns, applies filters, and renders posts.
// Compatible with constants.js / populateforms.js
// ================================

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

        allPosts = (await Promise.all(postPromises)).filter(p => p !== null);

        // Filter out expired posts
        allPosts = allPosts.filter(post => !post.expiresDate || new Date(post.expiresDate) > new Date());

        // Sort newest first
        allPosts.sort((a,b)=> new Date(b.date) - new Date(a.date));

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

    if (!posts || posts.length === 0) {
        grid.style.display = "none";
        noPosts.style.display = "block";
        return;
    }

    grid.innerHTML = "";
    grid.style.display = "grid";
    noPosts.style.display = "none";

    posts.forEach((post, index) => {
        const service = services.find(s => s.id === post.foodBankId);
        let orgName = post.foodBankId === "fb0" ? post.foodBankOther : (service ? service.name : "Unknown Organization");
        const orgType = service ? service.type : "organization";

        const date = new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const card = document.createElement("div");
        card.className = `post-card ${post.type || "update"}`;
        card.dataset.orgType = orgType;

        card.innerHTML = `
            <div class="post-header">
                <div>
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-meta">
                        <span class="post-location">${orgName}</span>
                        <span>•</span>
                        <span>${date}</span>
                    </div>
                </div>
                <span class="post-type ${post.type || "update"}">${getTypeLabel(post.type)}</span>
            </div>
            <p class="post-message">${post.message}</p>
            ${post.contactInfo ? `<div class="post-contact">📞 Contact: ${post.contactInfo}</div>` : ""}
        `;

        grid.appendChild(card);
    });
}

// --------------------
// Map post type to label
// --------------------
function getTypeLabel(type) {
    const labels = {
        "update": "Update",
        "event": "Event",
        "urgent": "Urgent",
        "food_available": "Food Available"
    };
    return labels[type] || "Update";
}

// --------------------
// Filter posts based on dropdowns
// --------------------
function filterPosts() {
    const orgFilter = document.getElementById("filterOrganization")?.value;
    const orgTypeFilter = document.getElementById("filterOrgType")?.value;
    const postTypeFilter = document.getElementById("filterPostType")?.value;

    let filtered = allPosts;

    if (orgFilter) filtered = filtered.filter(p => p.foodBankId === orgFilter);
    if (orgTypeFilter) filtered = filtered.filter(p => {
        const service = services.find(s => s.id === p.foodBankId);
        return service && service.type === orgTypeFilter;
    });
    if (postTypeFilter) filtered = filtered.filter(p => p.type === postTypeFilter);

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