const fs = require("fs");
const path = require("path");

const resourcesPath = "data/resources.json";
const resourcesDir = "data/resources";

let resources = [];

if (fs.existsSync(resourcesPath)) {
  resources = JSON.parse(fs.readFileSync(resourcesPath, "utf8"));
  console.log(`Loaded ${resources.length} existing resources`);
}

let maxId = 0;

resources.forEach((resource) => {
  const match = resource.id?.match(/rs(\d+)/);
  if (match) {
    maxId = Math.max(maxId, parseInt(match[1], 10));
  }
});

console.log(`Highest existing ID: rs${maxId}`);

if (!fs.existsSync(resourcesDir)) {
  console.log("data/resources directory does not exist");
  process.exit(0);
}

const files = fs.readdirSync(resourcesDir).filter((file) => file.endsWith(".json"));

console.log(`Found ${files.length} resource files`);

files.forEach((file) => {
  const filePath = path.join(resourcesDir, file);
  const entry = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!entry.resource?.title) {
    console.log(`Skipping ${file}: missing resource.title`);
    return;
  }

  let id = entry.resource?.id;

  if (!id) {
    maxId++;
    id = `rs${maxId}`;
  }

  const existingIndex = resources.findIndex((r) =>
    entry.resource?.id ? r.id === entry.resource.id : r.title === entry.resource.title
  );

  const resourceObj = {
    id,
    title: entry.resource.title,
    organization: entry.resource.organization || "",
    type: entry.resource.type || "",
    description: entry.resource.description || "",
    website: entry.resource.website || "",
    additional_link: entry.resource.additional_link || "",
    region_served: entry.coverage?.region_served || "",
    eligibility: entry.requirements?.eligibility || "",
    fees: entry.requirements?.fees || "",
    documents_required: entry.requirements?.documents_required || "",
    email: entry.contact?.email || "",
    phone: entry.contact?.phone || "",
    tags: entry.meta?.tags || [],
    additional_notes: entry.meta?.additional_notes || ""
  };

  if (existingIndex >= 0) {
    console.log(`Updating: ${resourceObj.title} (${id})`);
    resources[existingIndex] = resourceObj;
  } else {
    console.log(`Adding: ${resourceObj.title} (${id})`);
    resources.push(resourceObj);
  }
});

resources.sort((a, b) => {
  const aNum = parseInt((a.id || "").replace("rs", ""), 10) || 0;
  const bNum = parseInt((b.id || "").replace("rs", ""), 10) || 0;
  return aNum - bNum;
});

fs.writeFileSync(resourcesPath, JSON.stringify(resources, null, 2));

console.log(`✅ Updated resources.json (${resources.length} resources)`);
