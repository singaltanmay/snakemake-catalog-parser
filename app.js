const fs = require('fs');
const axios = require('axios');

const TRS_API_URL = 'http://localhost/ga4gh/trs/v2/tools';
const GITHUB_BASE_URL = "https://www.github.com";

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

// Deletes all non-required keys if they are undefined or null
function deleteNullNonReqdKeys(obj, reqd) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => reqd.includes(v) || (v && v != null && v != 'null')));
}

function createChecksumRegister({
    checksum,
    type
}) {
    const obj = {
        checksum,
        type
    }
    const reqdKeys = ['checksum', 'type'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

function createImageDataRegister({
    checksum,
    image_name,
    image_type,
    registry_host,
    size,
    updated
}) {
    const obj = {
        checksum,
        image_name,
        image_type,
        registry_host,
        size,
        updated
    }
    return deleteNullNonReqdKeys(obj, []);
}

function createFileWrapperRegister({
    checksum,
    content,
    url
}) {
    const obj = {
        checksum,
        content,
        url
    }
    return deleteNullNonReqdKeys(obj, []);
}

function createToolFileRegister({ file_type, path = "string" }) {
    const obj = {
        file_type,
        path
    }
    const reqdKeys = ['file_type', 'path'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

function createFilesRegister({
    file_wrapper,
    tool_file,
    type
}) {
    const obj = { file_wrapper, tool_file, type };
    const reqdKeys = ['file_wrapper', 'tool_file', 'type'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

function createToolVersionRegisterId(
    {
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
) {
    const obj = {
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
    return deleteNullNonReqdKeys(obj, []);
}

function createToolclassRegisterId({ description, id, name }) {
    const obj = {
        description: description,
        id: id,
        name: name
    }
    return deleteNullNonReqdKeys(obj, []);
}

function createToolRegister({ description, aliases, checker_url, has_checker, name, organization, toolclass, versions }) {
    const obj = {
        description,
        aliases,
        checker_url,
        has_checker,
        name,
        organization,
        toolclass,
        versions
    };
    const reqdKeys = ['organization', 'toolclass', 'versions'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

// Convert a SWC object into a TRS-Filer POST API object
function swcConverter(swcObj) {
    const organization = GITHUB_BASE_URL + '/' + swcObj.full_name.split('/')[0];
    const toolclass = createToolclassRegisterId({ description: swcObj.description, name: swcObj.full_name });
    const version = createToolVersionRegisterId({ author: [swcObj.full_name], name: swcObj.full_name, verified: true, verified_source: ["Snakemake Workflow Catalog"] });
    const trsObj = createToolRegister({ description: swcObj.description, name: swcObj.full_name, organization: organization, toolclass: toolclass, versions: [version] })
    return trsObj;
}

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

async function checkToolExists(name) {
    axios.get(TRS_API_URL, { params: { limit: 1, toolname: name } })
        .then(function (response) {
            //console.log(response['data']);
            return response['data'] && response['data'].length > 1
        })
        .catch(function (error) {
            console.error(error);
            return false;
        });

}

// Get the latest Snakemake Workflow Catalogue data file and POST all tools to TRS-Filer
axios.get("https://raw.githubusercontent.com/snakemake/snakemake-workflow-catalog/main/data.js").then(({ data }) => {
    data = JSON.parse(data.substring(data.indexOf("\n") + 1));
    let count = 0;
    data.forEach(it => {

        // Check if tool already exists in TRS
        const is_tool_already_exist = checkToolExists(it.full_name)
        if (!is_tool_already_exist) {
            const trsObject = swcConverter(it);
            try { postTRSTool(trsObject) } catch (e) {
                console.error(it);
            }
            console.log(`Added tool #${count} ${trsObject.name}`);
            count += 1;
        }
    });
});