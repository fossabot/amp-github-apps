/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import FancyLog from 'fancy-log';
import mime from 'mime-types';
import unzip from 'unzip-stream';
import {Storage} from '@google-cloud/storage';

/**
 * Takes the minified build and test fixtures from the
 * AMP Travis Build Storage bucket, unzips and writes to
 * a test website bucket that serves the files publicly.
 */
export async function unzipAndMove(prId: number): Promise<string> {
  const storage = new Storage({projectId: process.env.PROJECT_ID});
  const serveBucket = storage.bucket(process.env.SERVE_BUCKET);
  const buildFileName = `amp_dist_${prId}`;
  const buildFile =
    storage.bucket(process.env.BUILD_BUCKET).file(`${buildFileName}.zip`);

  return new Promise<string>((resolve, reject) => {
    buildFile.createReadStream()
      .pipe(unzip.Parse())
      .on('entry', entry => {
        const serveFileName = entry.path;
        const serveFile = serveBucket.file(serveFileName);
        entry.pipe(serveFile.createWriteStream({
          metadata: {
            contentType: mime.lookup(serveFileName),
          },
        })
          .on('error', error => {
            FancyLog(error);
            return reject;
          })
          .on('finish', () => {
            FancyLog(`Uploaded ${serveFileName}`);
          })
        );
      })
      .on('close', async() => {
        //TODO(estherkim): return uploaded URL (point to examples?)
        return resolve(`https://storage.googleapis.com/${process.env.SERVE_BUCKET}/${buildFileName}/view.html`);
      });
  });
};

module.exports = {
  unzipAndMove,
};

