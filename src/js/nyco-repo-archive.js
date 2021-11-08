import Tonic from '@optoolco/tonic/index.esm';

class NycoRepoArchive extends Tonic {
  /**
   * Gets data from a local JSON data path
   *
   * @param   {String}  path  The name of the file without extension
   *
   * @return  {Object}        JSON object of the response
   */
  async get(path) {
    try {
      const response = await fetch(`data/${path}.json`, {
        method: 'GET',
        mode: 'same-origin',
        // cache: 'force-cache'
      });

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV != 'production')
        console.dir(error); // eslint-disable-line no-console
    }
  }

  /**
   * Main render method for the component
   *
   * @return  {String}  String representing HTML markup
   */
  async * render() {
    yield this.html`<p>Loading Repositories...</p>`;

    const repositories = await this.get('repositories');

    let list = [];

    for (let index = 0; index < repositories.length; index++) {
      const repo = repositories[index];

      list.push(this.html`
        <article class="c-card p-2 small:p-3 border-navy hover:shadow-up">
          <header class="c-card__header items-start">
            <h2 class="c-card__title mie-1">
              <small class="text-blue font-normal inline-flex items-center">
                <svg aria-hidden="true" class="icon-ui mie-1">
                  <use xlink:href="#feather-github"></use>
                </svg>${repo.organization} /
              </small> <br> ${repo.name}
            </h2>

            <mark class="badge flex items-center text-green flex-shrink-0">
              <b>${String(repo.language)}</b>
            </mark>
          </header>

          <dl class="c-card__inline-description-list">
            <dt>Language</dt>
            <dd>${String(repo.language)}</dd>

            <dt>Stars</dt>
            <dd>${String(repo.stargazers_count)}</dd>

            <dt>Forks</dt>
            <dd>${String(repo.forks)}</dd>
          </dl>

          <div>
            <p>${String(repo.description)}</p>
          </div>

          <a class="c-card__cta" href="${repo.url}" target="_blank"></a>
        </article>
      `);
    }

    return this.html(list);
  }
}

export default NycoRepoArchive;