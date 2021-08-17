'use strict';

// Utilities
import Icons from '@nycopportunity/pttrn-scripts/src/icons/icons';

// Components
import Tonic from '@optoolco/tonic/index.esm'; // https://tonicframework.dev
import NycoRepoArchive from './nyco-repo-archive';

if (process.env.NODE_ENV != 'production')
  console.dir('Development Mode'); // eslint-disable-line no-console

new Icons('svg/svgs.svg');
new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/icons.svg');
new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/feather.svg');

Tonic.add(NycoRepoArchive);
