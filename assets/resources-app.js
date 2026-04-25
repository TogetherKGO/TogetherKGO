// TogetherKGO - Resources Page App

window.__RESOURCES_APP = (function () {
  var resources = [];

  var el = function(id) { return document.getElementById(id); };

  function normalizeRegion(value) {
    return String(value || "").trim().toLowerCase();
  }

  function classifyRegion(value) {
    var normalized = normalizeRegion(value);
    if (!normalized) return "";
    if (normalized === "toronto") return "toronto";
    return "other";
  }

  function populateSelect(selectId, options, defaultLabel) {
    var select = el(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">' + defaultLabel + "</option>";

    Object.keys(options || {}).forEach(function(key) {
      var option = document.createElement("option");
      option.value = key;
      option.textContent = options[key];
      select.appendChild(option);
    });
  }

  function loadData() {
    fetch("data/resources.json")
      .then(function(resp) { return resp.json(); })
      .then(function(data) {
        resources = data;
        applyFilters();
      })
      .catch(function(err) {
        console.error("Failed to load resources.json", err);
        var results = el("results");
        if (results) {
          results.innerHTML = '<li class="result-empty">Unable to load resources. Please refresh the page.</li>';
        }
      });
  }

  function populateFilters() {
    var constants = window.CONSTANTS || {};
    populateSelect("resourceType", constants.RESOURCE_TYPES || {}, "Any");
    populateSelect("regionServedFilter", constants.RESOURCE_REGIONS || {}, "All regions");
  }

  function listResults(items) {
    var ul = el("results");
    var countEl = el("resultCount");
    if (!ul) return;
    ul.innerHTML = "";

    if (countEl) {
      countEl.textContent = "We found " + items.length + " results:";
    }

    if (items.length === 0) {
      ul.innerHTML = '<li class="result-empty">No resources match your search criteria. Try adjusting your filters.</li>';
      return;
    }

    items.forEach(function(item, index) {
      var li = document.createElement("li");
      li.className = "result-item";
      var detailsId = "details-" + index;

      li.innerHTML =
        '<div class="result-number"><span>' + (index + 1) + '</span></div>' +
        '<div class="result-name notranslate">' + (item.title || "") + '</div>' +
        '<div class="result-address notranslate">' + (item.organization || "") + '</div>' +
        '<div class="result-toggle" onclick="document.getElementById(\'' + detailsId + '\').classList.toggle(\'show\'); this.querySelector(\'span\').textContent = document.getElementById(\'' + detailsId + '\').classList.contains(\'show\') ? \'Hide details  −\' : \'Show details  +\'">' +
          '<span>Show details  +</span>' +
        '</div>' +
        '<div class="result-details" id="' + detailsId + '">' +
          '<hr style="border:none;border-top:2px solid #fff;margin:0;">' +
          '<div class="result-tags">' +
            (item.tags || []).map(function(tag) { return '<span class="tag">' + tag.replace(/_/g, ' ') + '</span>'; }).join('') +
          '</div>' +
          '<hr style="border:none;border-top:2px solid #fff;margin:0;">' +
          '<div class="result-hours">' + (item.description || "") + '</div>' +
          '<hr style="border:none;border-top:2px solid #fff;margin:0;">' +
          '<div class="result-contact">' +
            (item.website ? '<a class="result-btn" href="' + item.website + '" target="_blank">🌐 Website</a>' : '') +
            (item.additional_link ? '<a class="result-btn" href="' + item.additional_link + '" target="_blank">🔗 Additional Link</a>' : '') +
          '</div>' +
        '</div>';

      ul.appendChild(li);
    });
  }

  function applyFilters() {
    var qEl = el("q");
    var resourceTypeEl = el("resourceType");
    var regionEl = el("regionServedFilter");

    if (!qEl) return;

    var q = qEl.value.toLowerCase().trim();
    var resourceType = resourceTypeEl ? resourceTypeEl.value : "";
    var regionServed = regionEl ? regionEl.value : "";

    var filtered = resources.filter(function(resource) {
      var text = [
        resource.title || "",
        resource.organization || "",
        resource.description || "",
        resource.type || ""
      ].concat((resource.tags || []).map(function(tag) { return tag.replace(/_/g, " "); }))
        .join(" ")
        .toLowerCase();

      var matchesSearch = !q || text.includes(q);
      var matchesResourceType = !resourceType || resource.type === resourceType;
      var matchesRegion = !regionServed || classifyRegion(resource.region_served) === regionServed;

      return matchesSearch && matchesResourceType && matchesRegion;
    });

    listResults(filtered);
  }

  function resetFilters() {
    var qEl = el("q");
    var resourceTypeEl = el("resourceType");
    var regionEl = el("regionServedFilter");

    if (qEl) qEl.value = "";
    if (resourceTypeEl) resourceTypeEl.value = "";
    if (regionEl) regionEl.value = "";

    applyFilters();
  }

  function setupEvents() {
    var applyBtn = el("applyBtn");
    var resetBtn = el("resetBtn");
    var qEl = el("q");

    if (applyBtn) applyBtn.onclick = applyFilters;
    if (resetBtn) resetBtn.onclick = resetFilters;
    if (qEl) qEl.addEventListener("input", applyFilters);
  }

  function boot() {
    populateFilters();
    setupEvents();
    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return {};
})();

