const fs = require('fs');
const axios = require('axios');

const TRS_API_URL = 'http://localhost/ga4gh/trs/v2/tools';
const GITHUB_BASE_URL = "https://www.github.com/";
const DESCRIPTER_TYPES = {
    CWL: "CWL",
    WDL: "WDL",
    NFL: "NFL",
    GALAXY: "GALAXY"
}
const IMAGE_TYPE = {
    DOCKER: "Docker",
    SINGULARITY: "Singularity",
    CONDA: "Conda"
}
const FILE_TYPE = {
    TEST_FILE: "TEST_FILE",
    PRIMARY_DESCRIPTOR: "PRIMARY_DESCRIPTOR",
    SECONDARY_DESCRIPTOR: "SECONDARY_DESCRIPTOR",
    CONTAINERFILE: "CONTAINERFILE",
    OTHER: "OTHER"
}

function createImageDataRegister({
    checksum = [],
    image_name = "string",
    image_type,
    registry_host = "string",
    size = 0,
    updated = "string"
}) {
    return {
        checksum,
        image_name,
        image_type,
        registry_host,
        size,
        updated
    }
}

function sanitizeNonRequiredKeys(obj, reqd) {
    let o = Object.fromEntries(Object.entries(obj).filter(([_, v]) => reqd.includes(v) || (v && v != null && v != 'null')));
    return o;
}

function createFileWrapper({
    checksum = [],
    content = "string",
    url = "string"
}) {
    return {
        checksum,
        content,
        url
    }
}

function createToolFileRegister({ file_type, path = "string" }) {
    return {
        file_type,
        path
    }
}

function createFilesRegister({
    file_wrapper,
    tool_file,
    type
}) { return { file_wrapper, tool_file, type } }

function createToolVersionRegisterId(
    {
        id = null,
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
    const result = {
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

    // Remove "id" key if null or undefined
    if (!result['id']) {
        delete result['id'];
        console.log(result);
    }

    return result;
}

function createToolclassRegisterId({ description = "string", id = "string", name = "string" }) {
    const obj = {
        description: description,
        id: id,
        name: name
    }
    const reqdKeys = [];
    return sanitizeNonRequiredKeys(obj, reqdKeys);
}

function createToolRegister({ description, aliases, checkerUrl, hasChecker, name, organization, toolclassRegisterId, versions }) {
    const obj = {
        description: description || "string",
        aliases: aliases || [],
        checker_url: checkerUrl || "string",
        has_checker: hasChecker || false,
        name: name || "string",
        organization: organization,
        toolclass: toolclassRegisterId,
        versions: versions
    };
    const reqdKeys = ['organization', 'toolclass', 'versions'];
    return sanitizeNonRequiredKeys(obj, reqdKeys);
}

// Convert a SWC object into a TRS-Filer POST API object
function swcConverter(swcObj) {
    console.log(swcObj);
    console.log("---------------")
    const version = createToolVersionRegisterId({ author: [swcObj.full_name], descriptor_type: [DESCRIPTER_TYPES.CWL], name: swcObj.full_name, verified: true, verified_source: ["Snakemake Workflow Catalog"] });
    const toolclass = createToolclassRegisterId({ description: swcObj.description, name: swcObj.full_name });
    return createToolRegister({ description: swcObj.description, name: swcObj.full_name, organization: GITHUB_BASE_URL + swcObj.full_name.split('/')[0], toolclassRegisterId: toolclass, versions: [version] })
}

const filePath = "/home/tanmay/Documents/snakemake-catalog-parser/data.js";

function postTRSTool(trsObj) {
    axios.post(TRS_API_URL, trsObj)
        .then(function (response) {
            return response['data'];
        })
        .catch(function (error) {
            console.error(error);
            throw new Error(error['code']);
        });
}

// Read the Snakemake Workflow Catalog data.js(on) file
fs.readFile(filePath, function (error, content) {
    //console.log(content.byteOffset(1000))
    const data = JSON.parse(content);
    data.forEach(it => {
        const trsObject = swcConverter(it);
        console.log(JSON.stringify(trsObject));
        try { postTRSTool(trsObject) } catch (e) {
            console.error(it);
            return;
        }
    })
});