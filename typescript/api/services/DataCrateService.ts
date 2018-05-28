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
      'isDataCrate'
    ];
    
    public isDataCrate(file: string) {
      sails.log.info("in the isDataCrate handler for " + file);
      return Observable.fromPromise(this.isDataCratePromise(file));
    }

    protected isDataCratePromise(file: string): Promise<Object> {
      return new Promise<Object>(function (resolve, reject) {
        fs.readFile(file, function(err, data) {
          sails.log.info("Read file " + file);
          if( err ) {
            sails.log.error("Error reading " + file);
            reject(err);
          } else {
            resolve(data);
          }
        })
      }).then(function(data) {
        return jszip.loadAsync(data);
      }).then(function (zip) {
        const BAGITFILE = sails.config.datacrate.bagitFile;
        const PROFILEPAT = sails.config.datacrate.profilePattern;
        if( BAGITFILE in zip['files'] ) {
          return zip.file(BAGITFILE).async('text').then(function(data) {
	    let m = data.match(PROFILEPAT);
	    if( m ) {
	      let v = m[1];
              return {
                'datacrate': m[1],
                'notes': "Datacrate v " + m[1],
                'contents': zip['files']
              };
 	    } else {
	      return {
                'datacrate': '',
                'notes': 'Bag',
                'contents': zip['files']
              };
	    }
          });
        } else {
          return Promise.resolve({
            'datacrate': '',
            'notes': 'Zip',
            'contents': zip['files']
          });
        }
      }).catch(function(err) {
        sails.log.info("error unzipping: " + err);
        return {'datacrate': '', 'error': err.message };
      });
    }
  }
}

module.exports = new Services.DataCrateService().exports();
