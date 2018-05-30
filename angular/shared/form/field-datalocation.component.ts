// Copyright (c) 2017 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
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
import { Input, Component, OnInit, Inject, Injector, Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { SimpleComponent } from './field-simple.component';
import { FieldBase } from './field-base';
import { BaseService } from '../base-service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as _ from "lodash-es";
import { RecordsService } from './records.service';
import { ConfigService } from '../config-service';
import { Observable } from 'rxjs';
import * as Uppy from 'uppy';

/**
 * Contributor Model
 *
 *
 * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
 *
 */



@Injectable()
export class DataCrateService extends BaseService {

  constructor (@Inject(Http) http: Http, @Inject(ConfigService) protected configService: ConfigService) {
    super(http, configService);
  }
  
  public isDataCrate(oid: string, fileId: string): Observable<Object> {
    const url = `${this.brandingAndPortalUrl}/record/${oid}/datacrate/${fileId}`;
    return this.http.get(url).flatMap(res => {
      const dcstatus = this.extractData(res);
      console.log("isDataCrate service " + fileId);
      console.log(dcstatus);
      return Observable.of(dcstatus);
    });
  }
}




export class DataLocationField extends FieldBase<any> {

  showHeader: boolean;
  validators: any;
  enabledValidators: boolean;
  value: object[];
  accessDeniedObjects: object[];
  failedObjects: object[];
  recordsService: RecordsService;
  dataCrateService: DataCrateService;
  columns: object[];
  newLocation:any = {type:"url", location:"",notes:""};
  dataTypes:object[] = [{
    'label': 'URL',
    'value': 'url',
  },
  {
    'label': 'Physical location',
    'value': 'physical',
  },
  {
    'label': 'File path',
    'value': 'file',
  },
  {
    'label': 'Attachment',
    'value': 'attachment'
  }
];

  dataTypeLookup:any = {
    'url':"URL",
    'physical':"Physical location",
    'attachment':"Attachment",
    'file':"File path"
  }

  constructor(options: any, injector: any) {
    super(options, injector);
    this.accessDeniedObjects = [];

    this.columns = options['columns'] || [];


    this.value = options['value'] || this.setEmptyValue();
    this.recordsService = this.getFromInjector(RecordsService);
    this.dataCrateService = this.getFromInjector(DataCrateService);
  }

  setValue(value:any, emitEvent:boolean = true) {
    this.formModel.setValue(value, {emitEvent: emitEvent, emitModelToViewChange:true });
    this.formModel.markAsTouched();
    this.formModel.markAsDirty();
  }

  setEmptyValue() {
    this.value = [];
    return this.value;
  }

  addLocation() {
    this.value.push(this.newLocation);
    this.setValue(this.value);
    this.newLocation = {
      type:"url",
      location:"",
      notes:""
    };
  }

  appendLocation(newLoc:any) {
    this.value.push(newLoc);
    this.setValue(this.value, true);
  }

  clearPendingAtt(value) {
    _.each(value, (val:any) => {
      if (val.type == 'attachment') {
       _.unset(val, 'pending');
      }
    });
  }

  removeLocation(loc: any) {
    _.remove(this.value, (val:any) => {
      return val.type == loc.type && val.name == loc.name && val.location == loc.location;
    });
    this.setValue(this.value);
  }

}
/**
* Component to display multiple data locations
*
*
*
*
*/
@Component({
  selector: 'data-location-selector',
  templateUrl: './field-data-location.html'
})
export class DataLocationComponent extends SimpleComponent {

  field: DataLocationField;
  uppy: any = null;
  oid: any = null;

    
  
  public ngOnInit() {
    let oid = this.field.fieldMap._rootComp.oid;
    if (_.isNull(oid) || _.isUndefined(oid) || _.isEmpty(oid)) {
      // wait for the OID to be set when record is created
      if (!this.field.fieldMap._rootComp.getSubscription('recordCreated')) {
        console.log(`Subscribing to record creation..... ${this.field.name}`);
        this.field.fieldMap._rootComp.subscribe('recordCreated', this.field.name, this.eventRecordCreate.bind(this));
        this.initUppy(oid);
      }
    }
    this.initUppy(oid);
  }

  public getDatalocations() {
    return this.field.value;
  }

  public eventRecordCreate(createdInfo) {
    console.log(`Created record triggered: `);
    console.log(createdInfo);
    this.field.fieldMap[this.field.name].instance.initUppy(createdInfo.oid);
  }

  public tempClearPending() {
    // temporarily clearing pending values
    const fieldVal = _.cloneDeep(this.field.fieldMap._rootComp.form.value[this.field.name]);
    this.field.clearPendingAtt(fieldVal);
    this.field.fieldMap._rootComp.form.controls[this.field.name].setValue(fieldVal, {emitEvent: true});
  }

  public applyPendingChanges(savedInfo) {
    if (savedInfo.success) {
      console.log(`Success, Field val is:`);
      // this.field.value = this.field.fieldMap._rootComp.form.value[this.field.name];
      this.field.fieldMap[this.field.name].field.value = this.field.fieldMap[this.field.name].control.value;
    } else {
      // reverse the value
      console.log(`Resetting....`);
      this.field.fieldMap._rootComp.form.controls[this.field.name].setValue(this.field.fieldMap[this.field.name].field.value);
    }
  }


  public initUppy(oid: string) {
    this.field.fieldMap[this.field.name].instance.oid = oid;
    if (this.uppy) {
      console.log(`Uppy already created... setting oid to: ${oid}`);
      this.field.fieldMap[this.field.name].instance.uppy.getPlugin('Tus').opts.endpoint = `${this.field.recordsService.getBrandingAndPortalUrl}/record/${oid}/attach`;
      return;
    }
    const uppyConfig = {
      debug: true,
      autoProceed: false
    };
    console.debug(`Using Uppy config:`);
    console.debug(JSON.stringify(uppyConfig));
    const dataCrateService = this.field.dataCrateService;
    const appConfig = this.field.recordsService.getConfig();
    const tusConfig =  {
      endpoint: `${this.field.recordsService.getBrandingAndPortalUrl}/record/${oid}/attach`
    };
    console.debug(`Using TUS config:::`);
    console.debug(JSON.stringify(tusConfig));
    this.uppy = Uppy.Core(uppyConfig);
    console.log(this.uppy);
    this.uppy.use(Uppy.Dashboard, {
      trigger: '.UppyModalOpenerBtn',
      inline: false,
      metaFields: [
        {id: 'notes', name: 'Notes', placeholder: 'Notes about this file.'}
      ]
    })
    .use(Uppy.Tus, tusConfig)
    .run();
    let fieldVal:any = null;
    // attach event handers...
    this.uppy.on('upload-success', (file, resp, uploadURL) => {
      console.debug("File info:");
      console.debug(file);
      console.debug("Response:");
      console.debug(resp);
      console.debug(`Upload URL:${uploadURL}`);
      // add to form control on each upload...
      const urlParts = uploadURL.split('/');
      const fileId = urlParts[urlParts.length - 1];
      const choppedUrl = urlParts.slice(6, urlParts.length).join('/');
      const newLoc = {
        type: "attachment",
        pending: true,
        manifest: null,
        location: choppedUrl,
        notes: file.meta.notes,
        mimeType: file.type,
        name: file.meta.name,
        fileId: fileId,
        uploadUrl: uploadURL
      };
      if( newLoc.mimeType === 'application/zip' ) {
        console.debug(`Checking if ${fileId} is a DataCrate`);
        console.log("adding new location for zip");
        dataCrateService.isDataCrate(oid, fileId)
          .subscribe((data) => {
            console.log("isDataCrate returned " + JSON.stringify(data));
            if( 'datacrate' in data ) {
              if( data['datacrate'] ) {
                newLoc.notes = 'DataCrate v' + data['datacrate'];
                if( 'name' in data ) {
                  newLoc.notes += '\n' + data['name'];
                }
                if( 'description' in data ) {
                  newLoc.notes += '\n' + data['description'];
                }
                newLoc.manifest = {
                  container: 'DataCrate',
                  version: data['datacrate'],
                  contents: data['contents'],
                  name: data['name'],
                  description: data['description']
                }
              }
            }
            this.field.appendLocation(newLoc);
          });
      } else {
        console.debug(`Adding new location:`);
        console.debug(newLoc);
        this.field.appendLocation(newLoc);
      }
    });
    // clearing all pending attachments...
    this.field.fieldMap._rootComp.subscribe('onBeforeSave', this.field.name, (savedInfo:any) => {
      console.log(`Before saving record triggered.. `);
      this.field.fieldMap[this.field.name].instance.tempClearPending();
    });

    // attach event handling for saving the record
    this.field.fieldMap._rootComp.subscribe('recordSaved', this.field.name, (savedInfo:any) => {
      console.log(`Saved record triggered.. `);
      this.field.fieldMap[this.field.name].instance.applyPendingChanges(savedInfo);
    });
  }

  public isAttachmentsDisabled() {
    const isDisabled = _.isEmpty(this.oid);
    return isDisabled;
  }

  public getAbsUrl(location:string) {
    return `${this.field.recordsService.getBrandingAndPortalUrl}/record/${location}`
  }


}




