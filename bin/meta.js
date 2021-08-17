const { request } = require('@octokit/request');
const fs = require('fs');
const HttpProxyAgent = require('http-proxy-agent');

const cnsl = require('@nycopportunity/pttrn/bin/util/console');
const alerts = require('@nycopportunity/pttrn/config/alerts');

let GITHUB_PERSONAL_ACCESS_TOKEN = '';
let OUTPUT = [];

/**
 * Write JSON Output
 *
 * @param  {String}  path  The path to write the file to
 */
const write = async (path = 'dist/data/repositories.json') => {
  try {
    await fs.writeFileSync(path, JSON.stringify(OUTPUT));

    cnsl.success(`Output ${alerts.str.path(path)} was made.`);
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * The main handler for requests to the API
 *
 * @param   {String}  req      A request matching one from the GitHub API https://docs.github.com/en/rest/reference
 * @param   {Object}  options  A list of options to pass along to the octokit.request() method
 */
const main = async (req, options) => {
  try {
    cnsl.describe(`${alerts.info} Retrieving ${alerts.str.string(options.org)} repository information.`);

    options.headers = {
      authorization: `token ${GITHUB_PERSONAL_ACCESS_TOKEN}`
    };

    if (process.env.HTTP_PROXY) {
      options.request = {
        agent: new HttpProxyAgent(process.env.HTTP_PROXY)
      };
    }

    let result = await request(req, options);

    // cnsl.describe(`Response sample and schema:
    //   ${alerts.str.string(JSON.stringify(result.data[0], undefined, 2))}`);

    for (let index = 0; index < result.data.length; index++) {
      const item = result.data[index];

      if (item.private || item.archived) continue;

      OUTPUT.push({
        'name': item.name,
        'full_name': item.full_name,
        'organization': options.org,
        'description': item.description,
        'url': item.html_url,
        'language': item.language,
        'stargazers_count': item.stargazers_count,
        'forks': item.forks
      });
    }

    cnsl.success(`Success. Added ${alerts.str.string(result.data.length)} item(s) to the output.`);

    return true;
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * The main runner for the meta command
 */
const run = async () => {
  try {
    GITHUB_PERSONAL_ACCESS_TOKEN = await fs.readFileSync('.gh-token');

    await main('GET /orgs/{org}/teams/{team_slug}/repos', {
      org: 'CityOfNewYork',
      team_slug: 'NYCOpportunity',
      type: 'public',
      per_page: 999999
    });

    await main('GET /orgs/{org}/repos', {
      org: 'NYCOpportunity',
      type: 'public',
      per_page: 999999
    });

    await write();
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * Export our methods
 *
 * @type {Object}
 */
module.exports = {
  run: run,
  main: main
};
