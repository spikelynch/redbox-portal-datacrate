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
import { Input, Component, OnInit, Inject, Injector, EventEmitter} from '@angular/core';
import { SimpleComponent } from './field-simple.component';
import { FieldBase } from './field-base';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as _ from "lodash-es";
import { DashboardService } from '../dashboard-service';
import { PlanTable, Plan } from '../dashboard-models';



/**
 * Contributor Model
 *
 *
 * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
 *
 */
export class RelatedObjectSelectorField extends FieldBase<any> {

  showHeader: boolean;
  validators: any;
  enabledValidators: boolean;
  hasInit: boolean;
  dashboardService: DashboardService;
  plans: PlanTable;
  searchFilterName: any;
  filteredPlans: Plan[];
  recordType:string;
  columnTitle:string;

  relatedObjectSelected:EventEmitter<string> = new EventEmitter<string>();

  constructor(options: any, injector: any) {
    super(options, injector);

    this.columnTitle = options['columnTitle'] || "Record title";
    this.value = options['value'] || this.setEmptyValue();
    this.recordType = options['recordType'];
    this.dashboardService = this.getFromInjector(DashboardService);
    var that = this;
    this.dashboardService.getAllRecordsCanEdit(this.recordType,'').then((draftPlans: PlanTable) => {
      this.plans = draftPlans;
      this.onFilterChange();
});
  }


  recordSelected(record, event) {
    this.setValue({oid: record.oid, title:record.title});
    this.relatedObjectSelected.emit(record.oid);
  }

  resetSelector() {
    this.setEmptyValue();
  }

  createFormModel(valueElem: any = undefined): any {
    if (valueElem) {
      this.value = valueElem;
    }

      this.formModel = new FormControl(this.value || []);

      if (this.value) {
        this.setValue(this.value);
      }

    return this.formModel;
  }

  setValue(value:any) {
    this.value=value;
    this.formModel.patchValue(value, {emitEvent: false });
    this.formModel.markAsTouched();
  }

  setEmptyValue() {
    this.value = {};
    return this.value;
  }

  onFilterChange() {
    this.filteredPlans = _.filter(this.plans.items, (plan: any) => {
      plan.selected = false;
      return _.toLower(plan.title[0]).includes(_.toLower(this.searchFilterName));
    });
  }

  resetFilter() {
    this.searchFilterName = null;
    this.onFilterChange();
  }

}

/**
* Component to display information from related objects within ReDBox
*
*
*
*/
@Component({
  selector: 'rb-RelatedObjectSelector',
  templateUrl: './field-relatedobjectselector.html'
})
export class RelatedObjectSelectorComponent extends SimpleComponent {
  field: RelatedObjectSelectorField;

}
