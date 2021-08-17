# NYCO Loves Open-source

This site is built with the [NYCO Patterns CLI](https://github.com/CityOfNewYork/patterns-cli) and styled using the [NYCO Patterns](https://cityofnewyork.github.io/nyco-patterns). The [Tonic Component Framework](https://tonicframework.dev/) renders the list of repositories using meta data retrieved from the [GitHub REST API](https://docs.github.com/en/rest).

## Contributing

Clone the repository and run `npm install`. You will need a GitHub Personal Access Token to be able to get up-to-date repository data. Generate a token in your [developer settings](https://github.com/settings/tokens), add it as the contents of the [.gh-token.sample](.gh-token.sample) file and rename the file to **.gh-token**.

### Commands

Commands are stored in the [package.json](package.json) file and can be run using NPM. Commands follow this pattern.

```shell
$ npm run {{ command }}
```

Below is a description of the available commands.

Command   | Arguments         | Description
----------|-------------------|-
`start`   |                   | Runs the Pattern CLI development server with watching and reloading.
`default` |                   | Runs the default Pattern CLI build command.
`version` | major/minor/patch | Hooks into the npm version script by regenerating the build with the version number.
`ghpages` |                   | Run the default command and publish to the testing environment.
`meta`    |                   | Regenerate the [dist/data/repositories.json](dist/data/repositories.json) file. This command requires a Personal GitHub Access Token you can generate in your [developer settings](https://github.com/settings/tokens).

[Additional commands from the Patterns CLI](https://github.com/CityOfNewYork/patterns-cli#commands) can also be run. Most commands will require the `NODE_ENV` variable to be set.

---

![The Mayor's Office for Economic Opportunity](NYCMOEO_SecondaryBlue256px.svg)

[The Mayor's Office for Economic Opportunity](http://nyc.gov/opportunity) (NYC Opportunity) is committed to sharing open-source software that we use in our products. Feel free to ask questions and share feedback. **Interested in contributing?** See our open positions on [buildwithnyc.github.io](http://buildwithnyc.github.io/). Follow our team on [Github](https://github.com/orgs/CityOfNewYork/teams/nycopportunity) (if you are part of the [@cityofnewyork](https://github.com/CityOfNewYork/) organization) or [browse our work on Github](https://github.com/search?q=nycopportunity).
