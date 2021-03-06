import { Component, Injectable, Inject, ElementRef } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { FormArray, FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { UserSimpleService } from '../../shared/user.service-simple';
import { DashboardService } from '../../shared/dashboard-service';
import { PlanTable, Plan } from '../../shared/dashboard-models';
import * as _ from "lodash-es";
import { LoadableComponent } from '../../shared/loadable.component';
import { OnInit } from '@angular/core';
import { PaginationModule, TooltipModule} from 'ngx-bootstrap';
import { TranslationService } from '../../shared/translation-service';
import { RecordsService } from '../../shared/form/records.service';

declare var pageData: any;
declare var jQuery: any;

@Component({
  moduleId: module.id,
  selector: 'dashboard',
  templateUrl: './dashboard.html'
})
// TODO: find a way to remove jQuery dependency
@Injectable()
export class DashboardComponent extends LoadableComponent  {
  branding: string;
  portal: string;
  recordType: string;
  typeLabel:string;
  workflowSteps:any = [];
  draftPlans: PlanTable;
  activePlans: PlanTable;
  records:any ={};
  saveMsgType = "info";
  initSubs: any;
  initTracker: any = {draftLoaded:false, activeLoaded: false};


  constructor( @Inject(DashboardService) protected dashboardService: DashboardService,  protected recordsService: RecordsService, @Inject(DOCUMENT) protected document: any, elementRef: ElementRef, translationService:TranslationService ) {
    super();
    this.initTranslator(translationService);
    this.draftPlans = new PlanTable();
    this.activePlans = new PlanTable();
    this.branding = elementRef.nativeElement.getAttribute('branding');
    this.portal = elementRef.nativeElement.getAttribute('portal');
    this.recordType = elementRef.nativeElement.getAttribute('recordType');
    this.initSubs = dashboardService.waitForInit((initStat:boolean) => {
      this.initSubs.unsubscribe();

      translationService.isReady(tService => {
        recordsService.getType(this.recordType).then(type => {
          this.typeLabel = this.getTranslated(`${this.recordType}-name-plural`, "Records");
        });
        recordsService.getWorkflowSteps(this.recordType).then(steps =>{
          this.workflowSteps = steps;
          _.each(steps,step => {
            dashboardService.getRecords(this.recordType,step.name,1).then((stagedRecords: PlanTable) => {
              this.setDashboardTitle(stagedRecords);
              this.records[step.name] = stagedRecords;
              this.initTracker.draftLoaded = true;
              this.checkIfHasLoaded();
            });
          });
        });
        this.initTracker.activeLoaded = true;
      });
    });
  }

  protected setDashboardTitle(planTable: PlanTable) {
    _.forEach(planTable.items, (plan: Plan) => {
      plan.dashboardTitle = (_.isUndefined(plan.title) || _.isEmpty(plan.title) || _.isEmpty(plan.title[0])) ? this.translationService.t('plan-with-no-title'): plan.title;
    });
  }

  public hasLoaded() {
    return this.translatorReady;
  }

  public pageChanged(event:any, step: string):void {
    this.dashboardService.getRecords('rdmp',step,event.page).then((stagedRecords: PlanTable) => {
      this.setDashboardTitle(stagedRecords);
      this.records[step] = stagedRecords;
    });
  }


  getTranslated(key, defValue) {
    if (!_.isEmpty(key) && !_.isUndefined(key)) {
      if (_.isFunction(key.startsWith)) {
        let translatedValue = this.translationService.t(key);
        if(translatedValue == key) {
        return defValue;
      } else {
        return translatedValue;
      }
      } else {
        return key;
      }
    } else {
      return defValue;
    }
  }

}
