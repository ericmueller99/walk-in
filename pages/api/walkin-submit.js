import {salesforceConnection} from "../../lib/helpers";
import {Salesforce} from 'salesforce-connect';

export default function handler(req,res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  console.log(req.body);

  const {basicForm, qualifyForm, walkInForm} = req.body;
  const {emailAddress, firstName, lastName, phoneNumber} = basicForm;
  const {loginUrl, username, password, connectionType} = salesforceConnection();
  const salesforce = new Salesforce(connectionType, {username, password, loginUrl});
  const vacancyIds = walkInForm.suites.map(s => s.vacancyId);
  const formSubmissionDetails = {
    Lead_Source__c: 'Form Submission',
    Lead_Source_Detail__c: 'QR Code - Walk-in',
    First_Name__c: firstName,
    Last_Name__c: lastName,
    Email__c: emailAddress,
    Phone__c: phoneNumber,
    Desired_Move_In_Date__c: qualifyForm.moveIn ? qualifyForm.moveIn : basicForm.moveIn,
    Suite_Type__c: qualifyForm.suiteTypes ? qualifyForm.suiteTypes.join(';') : basicForm.suiteTypes.join(';'),
    Number_of_Occupants__c: qualifyForm.numberOfOccupants ? qualifyForm.numberOfOccupants : basicForm.numberOfOccupants,
    Maximum_Budget__c: qualifyForm.maxBudget ? qualifyForm.maxBudget : basicForm.maxBudget,
    Pet_Friendly__c: qualifyForm.petFriendly ? true : !!basicForm.petFriendly,
    City_Preference__c: qualifyForm.cities && qualifyForm.cities.length > 0 ? qualifyForm.cities.join(';') : basicForm.cities && basicForm.cities.length > 0 ? basicForm.cities.join(';') : null,
    Neighbourhood__c: qualifyForm.neighbourhoods && qualifyForm.neighbourhoods.length > 0 ? qualifyForm.neighbourhoods.join(';') : basicForm.neighbourhoods && basicForm.neighbourhoods.length > 0 ?
      basicForm.neighbourhoods.join(';') : null,
    Related_Vacancy_Ids__c: vacancyIds.join(';'),
    Converts_Lead__c: true,
    Property_HMY__c: walkInForm.property
  }

  //insert into Salesforce
  salesforce.insertSingleRecord('Form_Submission__c', formSubmissionDetails)
    .then(formRes => {
      console.log('done!');
      console.log(formRes);
      res.status(200).json({
        result: true,
        data: formRes
      })
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        result: false,
        errorMessage: error.message || 'unknown internal error'
      })
    });

}