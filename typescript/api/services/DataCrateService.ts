// Copyright (c) 2018 University of Technology Sydney (http://www.uts.edu.au/)
//
// GNU GENERAL PUBLIC LICENSE
//    Version 2, June 1991
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

import { Observable } from 'rxjs/Rx';
import services = require('../core/CoreService.js');
import { Sails, Model } from "sails";
import * as request from "request-promise";

import * as fs from "fs";
import * as jszip from "jszip";
import unzip = require("unzip");
import * as path from "path";

declare var sails: Sails;
declare var Report: Model;
declare var _this;


export module Services {
  /**
   * Redbox-portal interface to DataCrate
   *
   * Author: Mike Lynch
   *
   */
  export class DataCrateService extends services.Services.Core.Service {
    
    protected _exportedMethods: any = [
      'isDataCrate',
      'extractDataCrate',
    ];
    
    public isDataCrate(dir: string, fileId: string) {
      return Observable.fromPromise(this.isDataCratePromise(dir, fileId));
    }

    protected isDataCratePromise(dir: string, fileId: string): Promise<Object> {
      return new Promise<Object>(function (resolve, reject) {
        const file = path.join(dir, fileId);
        fs.readFile(file, function(err, data) {
          if( err ) {
            sails.log.error("Error reading attachments: " + file);
            reject(err);
          } else {
            resolve(data);
          }
        })
      }).then(data => {
        return jszip.loadAsync(data);
      }).then(zip => {
        const BAGITFILE = sails.config.datacrate.bagitFile;
        const CATALOG = sails.config.datacrate.catalogFile;
        const PROFILEPAT = sails.config.datacrate.profilePattern;
        let files = Object.keys(zip['files']);
        if( BAGITFILE in zip['files'] ) {
          return zip.file(BAGITFILE).async('text').then(data => {
	    let m = data.match(PROFILEPAT);
	    if( m ) {
	      let v = m[1];
              return zip.file(CATALOG).async('text')
                .then(catalog => {
                  let root = this.dataCrateRoot(catalog);
                  return {
                    'datacrate': m[1],
                    'contents': files,
                    'name': root['name'],
                    'description': root['description']
                  }
                }).then(response => {
                  return this.dataCrateExtract(response, dir, fileId);
                }).catch(err => {
                  sails.log.error("Couldn't read " + CATALOG + ": " + err);
                  return {
                    'datacrate': m[1],
                    'notes':err,
                    'contents': files
                  };
                });
 	    } else {
	      return {
                'datacrate': '',
                'notes': 'Bag',
                'contents': files
              };
	    }
          });
        } else {
          return Promise.resolve({
            'datacrate': '',
            'notes': 'Zip',
            'contents': files
          });
        }
      }).catch(function(err) {
        sails.log.info("error unzipping: " + err);
        return {'datacrate': '', 'error': err };
      });
    }
    
    // returns the root 'data/' item from the DataCrate
    // catalog - this contains the name/description of the
    // dataset as a whole

    protected dataCrateRoot(catalog: string): Object|undefined {
      const jc = JSON.parse(catalog);
      const graph = jc['@graph'];
      const root = graph.filter(i => i['path'] === 'data/');
      if( root && root[0] ) {
        return root[0];
      }
      return undefined;    
    }



              
    
    protected dataCrateExtract(response: Object, dir: string, fileId: string):Promise<Object> {
      const repo = sails.config.datacrate.publishDir;
      const file = path.join(dir, fileId);
      const dest = path.join(repo, fileId);
      const url = sails.config.datacrate.urlBase + fileId + '/';
      // check if we've already done it!
      return new Promise((resolve, reject) => {
        try {
          fs.createReadStream(file)
            .pipe(unzip.Extract( { path: dest }))
            .on('close', () => {
              response['url'] = url;
              resolve(response);
            });
        } catch(e) {
          reject(e);
        }
      });
    }

  }

}
 



module.exports = new Services.DataCrateService().exports();
