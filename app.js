const axios = require('axios');
const {Octokit} = require("@octokit/core");
require('dotenv').config();

const TRS_API_URL = process.env.TRS_API_URL;
const SWC_DATA_URL = process.env.SWC_DATA_URL || "https://raw.githubusercontent.com/snakemake/snakemake-workflow-catalog/main/data.js";
const GITHUB_BASE_URL = "https://www.github.com";

const DESCRIPTER_TYPES = {
    CWL: "CWL",
    WDL: "WDL",
    NFL: "NFL",
    GALAXY: "GALAXY",
    SNAKEMAKE_WORKFLOW: "SWF"
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

const VERIFIED_SOURCE_SWC = "SNAKEMAKE_WORKFLOW_CATALOG";

// Deletes all non-required keys if they are undefined or null
function deleteNullNonReqdKeys(obj, reqd) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => reqd.includes(v) || (v && v != null && v != 'null')));
}

function createChecksumRegister({checksum, type}) {
    const obj = {
        checksum,
        type
    }
    const reqdKeys = ['checksum', 'type'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

function createImageDataRegister({checksum, image_name, image_type, registry_host, size, updated}) {
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

function createFileWrapperRegister({checksum, content, url}) {
    const obj = {
        checksum,
        content,
        url
    }
    return deleteNullNonReqdKeys(obj, []);
}

function createToolFileRegister({file_type, path = "string"}) {
    const obj = {
        file_type,
        path
    }
    const reqdKeys = ['file_type', 'path'];
    return deleteNullNonReqdKeys(obj, reqdKeys);
}

function createFilesRegister({file_wrapper, tool_file, type}) {
    const obj = {file_wrapper, tool_file, type};
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

function createToolclassRegisterId({description, id, name}) {
    const obj = {
        description: description,
        id: id,
        name: name
    }
    return deleteNullNonReqdKeys(obj, []);
}

function createToolRegister({description, aliases, checker_url, has_checker, name, organization, toolclass, versions}) {
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

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN})

// Fetch releases from GitHub's REST API
async function fetchGitHubReleases(owner, repo) {
    let requestOptions = {
        owner,
        repo,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    };
    try {
        let releases = await octokit.request('GET /repos/{owner}/{repo}/releases', requestOptions);
        const {status, url, headers, data} = await releases
        if (status === 200) return data;
        else throw Error(`Error: HTTP status ${status} for URL ${url}\n`);
    } catch (e) {
        throw new Error(`Octokit request to List Releases failed for ${JSON.stringify(requestOptions)}\n${e}`);
    }
}

// Package version details into TRS format after fetching from GitHub
async function getToolVersions(repoFullName) {
    try {
        const [owner, repo] = repoFullName.split('/');
        const releases = await fetchGitHubReleases(owner, repo);
        // if (releases.length > 0) {
        //     console.log(releases);
        // }
        const releaseToolVersions = [];
        for (let i = 0; i < releases.length; i++) {
            const release = releases[i];
            const files = [];
            if (release.tarball_url) {
                const fileWrapperRegister = createFileWrapperRegister({url: release.tarball_url});
                const toolFileRegister = createToolFileRegister({
                    file_type: FILE_TYPE.OTHER,
                    path: release.tarball_url
                });
                let filesRegister = createFilesRegister({
                    file_wrapper: fileWrapperRegister,
                    tool_file: toolFileRegister,
                    type: FILE_TYPE.OTHER
                });
                files.push(filesRegister);
            }
            if (release.zipball_url) {
                const fileWrapperRegister = createFileWrapperRegister({url: release.zipball_url});
                const toolFileRegister = createToolFileRegister({
                    file_type: FILE_TYPE.OTHER,
                    path: release.zipball_url
                });
                let filesRegister = createFilesRegister({
                    file_wrapper: fileWrapperRegister,
                    tool_file: toolFileRegister,
                    type: FILE_TYPE.OTHER
                });
                files.push(filesRegister);
            }
            const trsToolVersion = {
                id: release.id,
                author: release.html_url,
                descriptor_type: DESCRIPTER_TYPES.SNAKEMAKE_WORKFLOW,
                files,
                is_production: !release.prerelease && !release.draft,
                name: release.name,
                verified: true,
                verified_source: [VERIFIED_SOURCE_SWC]
            };
            let toolVersionRegisterId = deleteNullNonReqdKeys(trsToolVersion, ['id']);
            releaseToolVersions.push(createToolVersionRegisterId(toolVersionRegisterId));
        }
        return releaseToolVersions;
    } catch (e) {
        console.error(e);
        return [];
    }
}

// Convert a SWC object into a TRS-Filer POST API object
async function swcConverter(swcObj) {
    const organization = GITHUB_BASE_URL + '/' + swcObj.full_name.split('/')[0];
    const toolclass = createToolclassRegisterId({description: swcObj.description, name: swcObj.full_name});
    const toolRegister = createToolRegister({
        description: swcObj.description,
        name: swcObj.full_name,
        organization: organization,
        toolclass: toolclass,
        versions: await getToolVersions(swcObj.full_name)
    })
    let reqdKeys = ['organization', 'toolclass', 'versions'];
    let result = deleteNullNonReqdKeys(toolRegister, reqdKeys);
    return result;
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
    try {
        const response = await axios.get(TRS_API_URL, {params: {limit: 1, toolname: name}});
        //console.log(response['data']);
        return response['data'] && response['data'].length > 0
    } catch (error) {
        console.error(error);
        return false;
    }
}

console.log("Program is running!")

// Get the latest Snakemake Workflow Catalogue data file and POST all tools to TRS-Filer
axios.get(SWC_DATA_URL).then(({data}) => {
    // Parse the SWC data.js file while skipping the intial "var data =" line
    console.log("Response received");
    data = JSON.parse(data.substring(data.indexOf("\n") + 1));
    let count = 0;
    data.forEach(async it => {
        // Check if tool already exists in TRS
        const isToolExists = await checkToolExists(it.full_name)
        if (true || !isToolExists) {
            const trsObject = await swcConverter(it);
            try {
                postTRSTool(trsObject)
                console.log(`Added tool #${count} ${trsObject.name}`)
            } catch (e) {
                console.log(`Could not add tool #${count} ${trsObject.name}`)
            }
            console.error(it);
        }
        count += 1;
    });
});