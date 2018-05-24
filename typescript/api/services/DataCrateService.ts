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

	helloWorld(): string {
	    return "Hello, world";
	}

	isDataCrate(zfile: string, callback: (version: string|undefined) => any):void {
	    const BIPROFILE = sails.config.datacrate.bagitfile;
	    const DCRE = sails.config.datacrate.profilere;
	    fs.readFile(zfile, function(err, data) {
		if( err ) throw err;
		jszip.loadAsync(data).then(function (zip) {
		    if( KEYFILE in zip['files'] ) {
			zip.file(KEYFILE).async('text').then(function(data) {
			    let m = data.match(DCRE);
			    if( m ) {
				callback(m[1]);
			    } else {
				callback(undefined);
			    }
			});
		    } else {
			console.log("is a zip file, no bag-info.txt");
			callback(undefined);
		    }
		}).catch(function(err) {
		    console.log("jsz error, likely not a zip file");
		    callback(undefined);
		});
	    })
	}

	
	isDataCrate_old(zfile: string, callback: (version: string|undefined) => any):void {
	    sails.log.verbose("*** checking isDataCrate");
	    fs.readFile(zfile, function(err, data) {
		if( err ) {
		    sails.log.verbose("Error reading " + zfile);
		    sails.log.verbose(err);
		    callback(undefined);
		}
		sails.log.verbose("Calling jszip load");
		jszip.loadAsync(data).then(function (zip) {
		    var v = undefined;
		    for (var f in zip['files']) {
			sails.log.verbose("Scanning file " + f);
			var m = f.match(sails.config.datacrate.profile_re);
			if( m ) {
			    sails.log.verbose("Matched!");
			    v = m[1];
			    break;
			}
		    }
		    sails.log.verbose("It's a zip file, DataCrate version is " + v);
		    callback(v);	    
		}).catch(function(err) {
		    // not a zip file so not a zipped DataCrate
		    sails.log.verbose("Error trying to unzip " + zfile);
		    sails.log.verbose(err);
		    callback(undefined);
		});
	    })
	}

    }
}
module.exports = new Services.DataCrateService().exports();
