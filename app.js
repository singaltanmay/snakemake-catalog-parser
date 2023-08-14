const fs = require('fs');
const axios = require('axios');
const { versions } = require('process');

const url = 'http://localhost/ga4gh/trs/v2/tools';

function createToolVersionRegisterId(
    {
        id = "string",
        author = [],
        descriptor_type = [],
        files = [],
        images = [],
        included_apps = [],
        is_production = true,
        name = "string",
        signed = false,
        verified = false,
        verified_source = []
    }
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

function createToolclassRegisterId({ description = "string", id = "string", name = "string" }) {
    return {
        description: description,
        id: id,
        name: name
    }
}

function createToolRegister({ description, aliases, checkerUrl, hasChecker, name, organization, toolclassRegisterId, versions }) {
    return {
        description: description || "string",
        aliases: aliases || [],
        checker_url: checkerUrl || "string",
        has_checker: hasChecker || false,
        name: name || "string",
        organization: organization,
        toolclass: toolclassRegisterId,
        versions: versions
    }
}

// Convert a SWC object into a TRS-Filer POST API object
function trsConverter(swcObj) {
    console.log(swcObj);
    console.log("---------------")
    const version = createToolVersionRegisterId({ author: [swcObj.full_name], descriptor_type: ["CWL"], name: swcObj.full_name, verified: true, verified_source: ["Snakemake Workflow Catalog"] });
    const toolclass = createToolclassRegisterId({ description: swcObj.description, name: swcObj.full_name });
    return createToolRegister({ description: swcObj.description, name: swcObj.full_name, organization: "https://www.github.com/" + swcObj.full_name.split('/')[0], toolclassRegisterId: toolclass, versions: [version] })
}

const filePath = "/home/tanmay/Documents/snakemake-catalog-parser/data.js";

function postTRSTool(trsObj) {
    axios.post(url, trsObj)
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error['code']);
        });
}

// Read the Snakemake Workflow Catalog data.js(on) file
fs.readFile(filePath, function (error, content) {
    //console.log(content.byteOffset(1000))
    const data = JSON.parse(content);
    const trsObject = trsConverter(data[0]);
    console.log(JSON.stringify(trsObject));
    postTRSTool(trsObject);
});