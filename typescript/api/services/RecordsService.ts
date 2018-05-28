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

import { Observable } from 'rxjs/Rx';
import services = require('../core/CoreService.js');
import {Sails, Model} from "sails";
import * as request from "request-promise";
import * as luceneEscapeQuery from "lucene-escape-query";
import * as fs from 'fs';
const util = require('util');

declare var FormsService, RolesService, UsersService, WorkflowStepsService;
declare var sails: Sails;
declare var _;
declare var _this;

export module Services {
  /**
   * Records related functions...
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class Records extends services.Services.Core.Service {

    protected _exportedMethods: any = [
      'create',
      'updateMeta',
      'getMeta',
      'hasEditAccess',
      'hasViewAccess',
      'getOne',
      'search',
      'createBatch',
      'provideUserAccessAndRemovePendingAccess',
      'searchFuzzy',
      'addDatastream',
      'removeDatastream',
      'updateDatastream',
      'getDatastream'
    ];

    public create(brand, record, packageType, formName=sails.config.form.defaultForm): Observable<any> {
      // TODO: validate metadata with the form...
      const options = this.getOptions(sails.config.record.baseUrl.redbox+sails.config.record.api.create.url, null, packageType);

      options.body = record;
      sails.log.verbose(util.inspect(options, {showHidden: false, depth: null}))
      return Observable.fromPromise(request[sails.config.record.api.create.method](options));
    }

    public updateMeta(brand, oid, record): Observable<any> {
      // TODO: validate metadata with the form...
      const options = this.getOptions(sails.config.record.baseUrl.redbox+sails.config.record.api.updateMeta.url, oid);
      options.body = record;
      return Observable.fromPromise(request[sails.config.record.api.updateMeta.method](options));
    }

    public getMeta(oid) {
      const options = this.getOptions(sails.config.record.baseUrl.redbox+sails.config.record.api.getMeta.url, oid);
      return Observable.fromPromise(request[sails.config.record.api.getMeta.method](options));
    }
    /**
     * Compares existing record metadata with new metadata and either removes or deletes the datastream from the record

    FIXME: This needs to check if there's a DataCrate among the
    attachments, and if there is, don't push it into the 
    ReDBox storage, but extract it onto the web server file
    system and generate a URL for it.

    Note that extraction is a long process and has to be given
    to a WorkspaceAsync

    It needs to go here because this is an Observable chain



     */



      
    public updateDatastream(oid, record, newMetadata, fileRoot, deleteWhenAttached:boolean = true) {
      // loop thru the attachment fields and determine if we need to add or remove
      return FormsService.getFormByName(record.metaMetadata.form, true).flatMap(form =>{
        const reqs = [];
        record.metaMetadata.attachmentFields = form.attachmentFields;
        _.each(form.attachmentFields, (attField) => {
          const oldAttachments = record.metadata[attField];
          const newAttachments = newMetadata[attField];
          // process removals
          if (!_.isUndefined(oldAttachments) && !_.isNull(oldAttachments) && !_.isNull(newAttachments)) {
            const toRemove = _.differenceBy(oldAttachments, newAttachments, 'fileId');
            const fileIds = [];
            _.each(toRemove, (removeAtt) => {
              if (removeAtt.type == 'attachment') {
                fileIds.push(removeAtt.fileId);
              }
            });
            if (!_.isEmpty(fileIds)) {
              reqs.push(this.removeDatastreams(oid, fileIds));
            }
          }
          // process additions
          if (!_.isUndefined(newAttachments) && !_.isNull(newAttachments)) {
            const toAdd =  _.differenceBy(newAttachments, oldAttachments, 'fileId');
            const fileIds = [];
            _.each(toAdd, (addAtt) => {
              if (addAtt.type == 'attachment') {
                fileIds.push(addAtt.fileId);
                // reqs.push(Observable.of(null));
              }
            });
            if (!_.isEmpty(fileIds)) {
              reqs.push(this.addDatastreams(oid, fileIds));
            }
          }
        });
        if (!_.isEmpty(reqs)) {
          return Observable.of(reqs);
        } else {
          return Observable.of(null);
        }
      });
    }

    public removeDatastream(oid, fileId) {
      const apiConfig = sails.config.record.api.removeDatastream;
      const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
      opts.url = `${opts.url}?skipReindex=true&datastreamId=${fileId}`;
      return request[apiConfig.method](opts);
    }

      
    public addDatastream(oid, fileId) {
      const apiConfig = sails.config.record.api.addDatastream;
      const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
      opts.url = `${opts.url}?skipReindex=true&datastreamId=${fileId}`;
      const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;  
      opts['formData'] = {
        content: fs.createReadStream(fpath)
      };
      return request[apiConfig.method](opts);
    }

    public removeDatastreams(oid, fileIds: any[]) {
      const apiConfig = sails.config.record.api.removeDatastreams;
      const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
      const dataStreamIds = fileIds.join(',');
      opts.url = `${opts.url}?skipReindex=false&datastreamIds=${dataStreamIds}`;
      return request[apiConfig.method](opts);
    }

      // this returns a call to the datastream api on the old
      // redbox to push them into the storage.
      // big zip files will break it
      
    public addDatastreams(oid, fileIds: any[]) {
      const apiConfig = sails.config.record.api.addDatastreams;
      const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
      opts.url = `${opts.url}?skipReindex=false&datastreamIds=${fileIds.join(',')}`;
      const formData = {};
        _.each(fileIds, fileId => {
            const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
            sails.log.info(`Looping files _each: ${fileId}`);
            formData[fileId] = fs.createReadStream(fpath);
      });
      opts['formData'] = formData;

      return request[apiConfig.method](opts);
    }

    public getDatastream(oid, fileId) {
      const apiConfig = sails.config.record.api.getDatastream;
      const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
      opts.url = `${opts.url}?datastreamId=${fileId}`;
      opts.json = false;
      sails.log.verbose(`Getting datastream using: `);
      sails.log.verbose(JSON.stringify(opts));
      return Observable.fromPromise(request[apiConfig.method](opts));
    }

    protected getOptions(url, oid=null, packageType=null) {
      if (!_.isEmpty(oid)) {
        url = url.replace('$oid', oid);
      }
      if (!_.isEmpty(packageType)) {
        url = url.replace('$packageType', packageType);
      }
      return {url:url, json:true, headers: {'Authorization': `Bearer ${sails.config.redbox.apiKey}`, 'Content-Type': 'application/json; charset=utf-8'}};
    }

    /**
     * Fine-grained access to the record, converted to sync.
     *
     */
    public hasViewAccess(brand, user, roles, record): boolean {
      // merge with the edit user and roles, since editors are viewers too...
      const viewArr = record.authorization ? _.union(record.authorization.view, record.authorization.edit) : _.union(record.authorization_view, record.authorization_edit);
      const viewRolesArr = record.authorization ? _.union(record.authorization.viewRoles, record.authorization.editRoles) : _.union(record.authorization_viewRoles, record.authorization_editRoles);

      const uname = user.username;

      const isInUserView = _.find(viewArr, username=> {
        return uname == username;
      });
      if (!_.isUndefined(isInUserView)) {
        return true;
      }
      const isInRoleView = _.find(viewRolesArr, roleName => {
        const role = RolesService.getRole(brand, roleName);
        return role && !_.isUndefined(_.find(roles, r => {
            return role.id == r.id;
        }));
      });
      return !_.isUndefined(isInRoleView);
      // Lines below commented out because we're not checking workflow auths anymore,
      // we're expecting that the workflow auths are bolted into the document on workflow updates.
      //
      // if (isInRoleEdit !== undefined) {
      //   return Observable.of(true);
      // }
      //
      // return WorkflowStepsService.get(brand, record.workflow.stage).flatMap(wfStep => {
      //   const wfHasRoleEdit = _.find(wfStep.config.authorization.editRoles, roleName => {
      //     const role = RolesService.getRole(brand, roleName);
      //     return role && UsersService.hasRole(user, role);
      //   });
      //   return Observable.of(wfHasRoleEdit !== undefined);
      // });
    }

    /**
     * Fine-grained access to the record, converted to sync.
     *
     */
    public hasEditAccess(brand, user, roles, record): boolean {
      const editArr = record.authorization ? record.authorization.edit : record.authorization_edit;
      const editRolesArr = record.authorization ? record.authorization.editRoles : record.authorization_editRoles;
      const uname = user.username;

      const isInUserEdit = _.find(editArr, username=> {
        sails.log.verbose(`Username: ${uname} == ${username}`);
        return uname == username;
      });
      sails.log.verbose(`isInUserEdit: ${isInUserEdit}`);
      if (!_.isUndefined(isInUserEdit)) {
        return true;
      }
      const isInRoleEdit = _.find(editRolesArr, roleName => {
        const role = RolesService.getRole(brand, roleName);
        return role && !_.isUndefined(_.find(roles, r => {
            return role.id == r.id;
        }));
      });
      return !_.isUndefined(isInRoleEdit);
      // Lines below commented out because we're not checking workflow auths anymore,
      // we're expecting that the workflow auths are bolted into the document on workflow updates.
      //
      // if (isInRoleEdit !== undefined) {
      //   return Observable.of(true);
      // }
      //
      // return WorkflowStepsService.get(brand, record.workflow.stage).flatMap(wfStep => {
      //   const wfHasRoleEdit = _.find(wfStep.config.authorization.editRoles, roleName => {
      //     const role = RolesService.getRole(brand, roleName);
      //     return role && UsersService.hasRole(user, role);
      //   });
      //   return Observable.of(wfHasRoleEdit !== undefined);
      // });
    }

    public createBatch(type, data, harvestIdFldName) {
      const options = this.getOptions(sails.config.record.baseUrl.redbox+sails.config.record.api.harvest.url, null, type);
      data = _.map(data, dataItem => {
        return {harvest_id: _.get(dataItem, harvestIdFldName, ''), metadata: {metadata: dataItem, metaMetadata: {type:type}}};
      });
      options.body = {records: data};
      sails.log.verbose(`Sending data:`);
      sails.log.verbose(options.body);
      return Observable.fromPromise(request[sails.config.record.api.harvest.method](options));
    }

    public search(type, searchField, searchStr, returnFields) {
      const url = `${this.getSearchTypeUrl(type, searchField, searchStr)}&start=0&rows=${sails.config.record.export.maxRecords}`;
      sails.log.verbose(`Searching using: ${url}`);
      const options = this.getOptions(url);
      return Observable.fromPromise(request[sails.config.record.api.search.method](options))
              .flatMap(response => {
                const customResp = [];
                _.forEach(response.response.docs, solrdoc => {
                  const customDoc = {};
                  _.forEach(returnFields, retField => {
                    customDoc[retField] = solrdoc[retField][0];
                  });
                  customResp.push(customDoc);
                });
                return Observable.of(customResp);
              });
    }

    public searchFuzzy(type, workflowState, searchQuery, exactSearches, facetSearches, brand, user, roles, returnFields) {
      const username = user.username;
      // const url = `${this.getSearchTypeUrl(type, searchField, searchStr)}&start=0&rows=${sails.config.record.export.maxRecords}`;
      let searchParam = workflowState ? ` AND workflow_stage:${workflowState} ` : '';
      searchParam = `${searchParam} AND full_text:${searchQuery}`;
      _.forEach(exactSearches, (exactSearch) => {
        searchParam = `${searchParam}&fq=${exactSearch.name}:${this.luceneEscape(exactSearch.value)}`
      });
      if (facetSearches.length > 0) {
        searchParam = `${searchParam}&facet=true`
        _.forEach(facetSearches, (facetSearch) => {
          searchParam = `${searchParam}&facet.field=${facetSearch.name}${_.isEmpty(facetSearch.value) ? '' : `&fq=${facetSearch.name}:${this.luceneEscape(facetSearch.value)}`}`
        });
      }

      let url = `${sails.config.record.baseUrl.redbox}${sails.config.record.api.search.url}?q=metaMetadata_brandId:${brand.id} AND metaMetadata_type:${type}${searchParam}&version=2.2&wt=json&sort=date_object_modified desc`;
      url = this.addAuthFilter(url, username, roles, brand, false)
      sails.log.verbose(`Searching fuzzy using: ${url}`);
      const options = this.getOptions(url);
      return Observable.fromPromise(request[sails.config.record.api.search.method](options))
              .flatMap(response => {
                const customResp = {records: []};
                _.forEach(response.response.docs, solrdoc => {
                  const customDoc = {};
                  _.forEach(returnFields, retField => {
                    if (_.isArray(solrdoc[retField])) {
                      customDoc[retField] = solrdoc[retField][0];
                    } else {
                      customDoc[retField] = solrdoc[retField];
                    }
                  });
                  customDoc["hasEditAccess"] = this.hasEditAccess(brand, user, roles, solrdoc);
                  customResp.records.push(customDoc);
                });
                // check if have facets turned on...
                if (response.facet_counts) {
                  customResp['facets'] = [];
                  _.forOwn(response.facet_counts.facet_fields, (facet_field, facet_name) => {
                    const numFacetsValues = _.size(facet_field) / 2;
                    const facetValues = [];
                    for (var i=0,j=0; i < numFacetsValues;i++) {
                      facetValues.push({
                        value: facet_field[j++],
                        count: facet_field[j++]
                      });
                    }
                    customResp['facets'].push({name: facet_name, values: facetValues});
                  });
                }
                return Observable.of(customResp);
              });
    }

    protected addAuthFilter(url, username, roles, brand, editAccessOnly=undefined) {

      var roleString = ""
      var matched = false;
      for (var i = 0; i < roles.length; i++) {
        var role = roles[i]
        if (role.branding == brand.id) {
          if (matched) {
            roleString += " OR ";
            matched = false;
          }
          roleString += roles[i].name;
          matched = true;
        }
      }
      url = url + "&fq=authorization_edit:" + username + (editAccessOnly ?  "" : ( " OR authorization_view:" + username  + " OR authorization_viewRoles:(" + roleString + ")" )) + " OR authorization_editRoles:(" + roleString + ")";
      return url;
    }

    public getOne(type) {
      const url = `${this.getSearchTypeUrl(type)}&start=0&rows=1`;
      sails.log.verbose(`Getting one using url: ${url}`);
      const options = this.getOptions(url);
      return Observable.fromPromise(request[sails.config.record.api.search.method](options))
            .flatMap(response => {
              return Observable.of(response.response.docs);
            });
    }

    protected getSearchTypeUrl(type, searchField=null, searchStr=null) {
      const searchParam = searchField ? ` AND ${searchField}:${searchStr}*` : '';
      return `${sails.config.record.baseUrl.redbox}${sails.config.record.api.search.url}?q=metaMetadata_type:${type}${searchParam}&version=2.2&wt=json&sort=date_object_modified desc`;
    }

    protected provideUserAccessAndRemovePendingAccess(oid,userid,pendingValue) {
      var metadataResponse = this.getMeta(oid);

      metadataResponse.subscribe(metadata =>{
      // remove pending edit access and add real edit access with userid
      var pendingEditArray = metadata['authorization']['editPending'];
      var editArray = metadata['authorization']['edit'];
      for(var i=0; i < pendingEditArray.length; i++) {
        if(pendingEditArray[i] == pendingValue) {
          pendingEditArray = pendingEditArray.filter(e => e !== pendingValue);
          editArray = editArray.filter(e => e !== userid);
          editArray.push(userid);
        }
      }
      metadata['authorization']['editPending'] = pendingEditArray;
      metadata['authorization']['edit'] = editArray;

      var pendingViewArray = metadata['authorization']['viewPending'];
      var viewArray = metadata['authorization']['view'];
      for(var i=0; i < pendingViewArray.length; i++) {
        if(pendingViewArray[i] == pendingValue) {
          pendingViewArray = pendingViewArray.filter(e => e !== pendingValue);
          viewArray = viewArray.filter(e => e !== userid);
          viewArray.push(userid);
        }
      }
      metadata['authorization']['viewPending'] = pendingViewArray;
      metadata['authorization']['view'] = viewArray;

      this.updateMeta(null, oid, metadata);
    });

    }

    protected luceneEscape(str: string) {
      return luceneEscapeQuery.escape(str);
    }
  }
}
module.exports = new Services.Records().exports();
