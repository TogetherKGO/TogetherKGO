
// community-board.js – Figma Design


function parsePost(raw) {
  var type = (raw.post && raw.post.type) || "update";
  var base = {
    type: type,
    title: (raw.post && raw.post.title) || "Untitled",
    message: (raw.post && raw.post.message) || "",
    date: (raw.post && raw.post.date) || null,
    expiresDate: (raw.post && raw.post.expiresDate) || null,
    contactInfo: (raw.post && raw.post.contactInfo) || "",
    foodBankId: (raw.organization && raw.organization.foodBankId) || "fb0",
    orgOther: (raw.organization && raw.organization.foodBankOther) || "",
    location: (raw.location && raw.location.location) || null,
    image: (raw.post && raw.post.image) || null,
    rawData: raw
  };

  switch(type) {
    case "recurring_event":
      base.recurringDates = (raw.recurringEvent && raw.recurringEvent.recurringDates) || "";
      base.startRecurringDates = (raw.recurringEvent && raw.recurringEvent.startRecurringDates) || null;
      break;
    case "event":
      base.eventDate = (raw.uniqueEvent && raw.uniqueEvent.eventDate) || null;
      break;
    case "food_available":
      base.timeWindow = (raw.food && raw.food.timeWindow) || "";
      base.availableItems = (raw.food && raw.food.availableItems) || "";
      break;
  }
  return base;
}

var allPosts = [];
var services = [];

function populateServicesDropdown(servicesList) {
  var select = document.getElementById("filterOrganization");
  if (!select) return;
  select.innerHTML = '<option value="">All Organizations</option>';
  servicesList.sort(function(a, b) { return a.name.localeCompare(b.name); })
    .forEach(function(service) {
      var option = document.createElement("option");
      option.value = service.id;
      option.textContent = service.name;
      select.appendChild(option);
    });
}

function loadServices() {
  return fetch("data/services.json")
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      services = data;
      populateServicesDropdown(services);
    })
    .catch(function(err) { console.error("Error loading services:", err); });
}

function loadPosts() {
  var repoOwner = "TogetherKGO";
  var repoName = "TogetherKGO";
  var branch = "main";
  var postsPath = "data/posts";
  var apiUrl = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/contents/" + postsPath + "?ref=" + branch;

  return fetch(apiUrl)
    .then(function(response) {
      if (!response.ok) {
        displayPosts([]);
        document.getElementById("loading").style.display = "none";
        return;
      }
      return response.json();
    })
    .then(function(files) {
      if (!files) return;
      var jsonFiles = files.filter(function(f) { return f.name.endsWith(".json"); });
      return Promise.all(jsonFiles.map(function(file) {
        return fetch(file.download_url)
          .then(function(r) { return r.json(); })
          .catch(function() { return null; });
      }));
    })
    .then(function(posts) {
      if (!posts) return;
      allPosts = posts.filter(function(p) { return p !== null; }).map(parsePost);
      allPosts = allPosts.filter(function(p) { return !p.expiresDate || new Date(p.expiresDate) > new Date(); });
      allPosts.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
      displayPosts(allPosts);
      document.getElementById("loading").style.display = "none";
    })
    .catch(function(err) {
      console.error("Error loading posts:", err);
      displayPosts([]);
      document.getElementById("loading").style.display = "none";
    });
}

function getTypeLabel(type) {
  return (window.CONSTANTS && window.CONSTANTS.UPDATE_TYPES && window.CONSTANTS.UPDATE_TYPES[type]) || "Update";
}

function getWhenText(post) {
  if (post.type === "recurring_event" && post.recurringDates) return post.recurringDates;
  if (post.type === "event" && post.eventDate) return new Date(post.eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  if (post.type === "food_available" && post.timeWindow) return post.timeWindow;
  return "";
}

function displayPosts(posts) {
  var grid = document.getElementById("postsGrid");
  var noPosts = document.getElementById("noPosts");
  var countEl = document.getElementById("resultCount");

  if (!grid) return;

  if (countEl) countEl.textContent = "We found " + posts.length + " results:";

  if (!posts.length) {
    grid.style.display = "none";
    noPosts.style.display = "block";
    return;
  }

  grid.innerHTML = "";
  grid.style.display = "grid";
  noPosts.style.display = "none";

  posts.forEach(function(post, index) {
    var service = services.find(function(s) { return s.id === post.foodBankId; });
    var orgName = post.foodBankId === "fb0" ? post.orgOther : (service ? service.name : "Unknown Organization");
    var dateText = post.date ? new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    var whenText = getWhenText(post);
    var imgSrc = post.image || "";

    var card = document.createElement("div");
    card.className = "post-card";
    card.dataset.orgType = service ? service.type : "organization";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Open details for " + post.title);
    card.onclick = function() { openPostModal(index); };
    card.onkeydown = function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPostModal(index);
      }
    };

    var html =
      '<div class="card-number"><span>' + (index + 1) + '</span></div>' +
      '<div class="card-title notranslate">' + post.title + '</div>' +
      '<div class="card-org notranslate">' + orgName + '</div>' +
      '<div class="card-separator" aria-hidden="true"></div>' +
      '<span class="card-tag">' + getTypeLabel(post.type) + '</span>' +
      '<div class="card-separator" aria-hidden="true"></div>';

    if (whenText) {
      html += '<div class="card-when"><span class="when-label">When</span><span class="when-value">' + whenText + '</span></div>' +
        '<div class="card-separator" aria-hidden="true"></div>';
    }

    html +=
      '<div class="card-footer">' +
        '<span class="card-posted">Posted: ' + dateText + '</span>' +
        '<button class="card-toggle" onclick="openPostModal(' + index + ', event)">Show details &nbsp;+</button>' +
      '</div>';

    if (imgSrc) {
      html += '<div class="card-image"><img src="' + imgSrc + '" alt="' + post.title + '" loading="lazy"></div>';
    } else {
      html += '<div class="card-image"><div class="card-image-placeholder"></div></div>';
    }

    card.innerHTML = html;
    grid.appendChild(card);
  });
}

// Modal
function openPostModal(index, event) {
  if (event) event.stopPropagation();
  var posts = getCurrentFilteredPosts();
  var post = posts[index];
  if (!post) return;

  var service = services.find(function(s) { return s.id === post.foodBankId; });
  var orgName = post.foodBankId === "fb0" ? post.orgOther : (service ? service.name : "Unknown Organization");
  var dateText = post.date ? new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  var whenText = getWhenText(post);

  document.getElementById("modalPostedDate").textContent = "Posted: " + dateText;
  document.getElementById("modalNumber").textContent = (index + 1);
  document.getElementById("modalTitle").textContent = post.title;
  document.getElementById("modalOrg").textContent = orgName;
  document.getElementById("modalTag").textContent = getTypeLabel(post.type);

  // Details
  var detailsHtml = "";
  if (whenText) {
    detailsHtml += '<div class="post-modal-separator" aria-hidden="true"></div>' +
      '<div class="post-modal-detail-row"><span class="detail-label">When</span><span class="detail-value">' + whenText + '</span></div>';
  }
  if (post.message) {
    detailsHtml += '<div class="post-modal-separator" aria-hidden="true"></div>' +
      '<div class="post-modal-detail-row"><span class="detail-label">About</span><span class="detail-value">' + post.message + '</span></div>';
  }
  if (service && service.address) {
    detailsHtml += '<div class="post-modal-separator" aria-hidden="true"></div>' +
      '<div class="post-modal-detail-row"><span class="detail-label">Where</span><span class="detail-value">' + service.address + '</span></div>';
  }
  document.getElementById("modalDetails").innerHTML = detailsHtml;

  // Contact
  var contactHtml = "";
  if (post.contactInfo || (service && service.phone)) {
    contactHtml += '<div class="post-modal-separator" aria-hidden="true"></div>' +
      '<div class="post-modal-detail-row"><span class="detail-label">Contact</span><span class="detail-value"></span></div>' +
      '<div class="post-modal-contact-buttons">';
    var phone = (service && service.phone) || post.contactInfo;
    if (phone) {
      contactHtml += '<a class="post-modal-contact-btn" href="tel:' + phone + '">📞 ' + phone + '</a>';
    }
    if (service && service.website) {
      contactHtml += '<a class="post-modal-contact-btn" href="' + service.website + '" target="_blank">🌐 Website</a>';
    }
    if (service && service.address) {
      var dirUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(service.address);
      contactHtml += '<a class="post-modal-contact-btn green" href="' + dirUrl + '" target="_blank">🗺️ Directions</a>';
    }
    contactHtml += '</div>';
  }
  document.getElementById("modalContact").innerHTML = contactHtml;

  // Image
  var imgEl = document.getElementById("modalImage");
  if (post.image) {
    imgEl.src = post.image;
    imgEl.style.display = "block";
  } else {
    imgEl.style.display = "none";
  }

  document.getElementById("postModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePostModal() {
  document.getElementById("postModal").style.display = "none";
  document.body.style.overflow = "";
}

var currentFilteredPosts = [];

function getCurrentFilteredPosts() {
  return currentFilteredPosts.length ? currentFilteredPosts : allPosts;
}

function filterPosts() {
  var orgFilter = document.getElementById("filterOrganization") ? document.getElementById("filterOrganization").value : "";
  var orgTypeFilter = document.getElementById("orgType") ? document.getElementById("orgType").value : "";
  var postTypeFilter = document.getElementById("postType") ? document.getElementById("postType").value : "";
  var urgencyFilter = document.getElementById("urgencyFilter") ? document.getElementById("urgencyFilter").checked : false;

  var filtered = allPosts.filter(function(p) {
    if (orgFilter && p.foodBankId !== orgFilter) return false;

    if (orgTypeFilter) {
      var service = services.find(function(s) { return s.id === p.foodBankId; });
      var orgType = (!service || service.type === "placeholder") ? "individual" : service.type;
      if (orgType !== orgTypeFilter) return false;
    }

    if (postTypeFilter && p.type !== postTypeFilter) return false;

    if (urgencyFilter && p.type !== "urgent" && p.type !== "food_available") return false;

    return true;
  });

  currentFilteredPosts = filtered;
  displayPosts(filtered);
}

function resetFilters() {
  var orgEl = document.getElementById("filterOrganization");
  var orgTypeEl = document.getElementById("orgType");
  var postTypeEl = document.getElementById("postType");
  var urgencyEl = document.getElementById("urgencyFilter");

  if (orgEl) orgEl.value = "";
  if (orgTypeEl) orgTypeEl.value = "";
  if (postTypeEl) postTypeEl.value = "";
  if (urgencyEl) urgencyEl.checked = false;

  currentFilteredPosts = [];
  displayPosts(allPosts);
}

function setupFilters() {
  ["filterOrganization", "orgType", "postType"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", filterPosts);
  });
  var urgencyEl = document.getElementById("urgencyFilter");
  if (urgencyEl) urgencyEl.addEventListener("change", filterPosts);
}

// Close modal on Escape key
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closePostModal();
});

// Init
document.addEventListener("DOMContentLoaded", function() {
  setupFilters();
  loadServices().then(function() { return loadPosts(); });
});
