const fs = require('fs');

function createToolVersionRegisterId(
    id,
    author,
    descriptor_type,
    files,
    images,
    included_apps,
    is_production,
    name,
    signed,
    verified,
    verified_source
) {
    return {
        id,
        author,
        descriptor_type,
        files,
        images,
        included_apps,
        is_production,
        name,
        signed,
        verified,
        verified_source
    }
}

function createToolclassRegisterId(description, id, name) {
    return {
        description: description,
        id: id,
        name: name
    }
}

function createToolRegister(description, aliases, checkerUrl, hasChecker, name, organization, toolclassRegisterId, versions) {
    return {
        description: description,
        aliases: aliases,
        checker_url: checkerUrl,
        has_checker: hasChecker,
        name: name,
        organization: organization,
        toolclass: toolclassRegisterId,
        versions: versions

    }
}

// Convert a SWC object into a TRS-Filer POST API object
function trsConverter(swcObj) {
    console.log(swcObj);
    console.log("---------------")
    const version = createToolVersionRegisterId(0, [swcObj.full_name], "CWL", null, null, null, true, swcObj.full_name, false, true, ["Snakemake Workflow Catalog"]);
    const toolclass = createToolclassRegisterId(swcObj.description, null, swcObj.full_name);
    return createToolRegister(swcObj.description, null, null, null, swcObj.full_name, "https://www.github.com/" + swcObj.full_name.split('/')[0], toolclass, [version])
}

const filePath = "/home/tanmay/Documents/snakemake-catalog-parser/data.js";

// Read the Snakemake Workflow Catalog data.js(on) file
fs.readFile(filePath, function (error, content) {
    //console.log(content.byteOffset(1000))
    const data = JSON.parse(content);
    console.log(JSON.stringify(trsConverter(data[0])));
});