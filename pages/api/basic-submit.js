import {post} from "../../lib/hollyburn-api";

export default async function handler(req, res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  //making sure that all the required fields are present.
  const {firstName, lastName, emailAddress, phoneNumber} = req.body;
  if (!firstName || !lastName || !emailAddress || !phoneNumber) {
    res.status(400).json({
      result: false,
      errorMessage: "firstName, lastName, emailAddress, and phoneNumber are required"
    })
    return;
  }

  try {
    const body = await post('/v2/walk-in/lookup', {emailAddress});
    if (!body || !body.found) {
      res.status(200).json({
        result: true
      });
      return;
    }

    const preferences = body.preferences || {};
    res.status(200).json({
      result: true,
      FirstName: body.firstName,
      LastName: body.lastName,
      Email: body.emailAddress,
      Phone: body.phoneNumber,
      isQualified: body.isQualified,
      invalidFields: body.invalidFields,
      Preference__c: {
        Suite_Type__c: preferences.suiteTypes ?? null,
        Maximum_Budget__c: preferences.maxBudget ?? null,
        Desired_Move_In_Date__c: preferences.moveIn ?? null,
        Number_of_Occupants__c: preferences.numberOfOccupants ?? null,
        City__c: preferences.cities ?? null,
        Neighbourhood__c: preferences.neighbourhoods ?? null,
        Pet_Friendly__c: preferences.petFriendly
      }
    });
  }
  catch (error) {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
    res.status(status).json({
      result: false,
      errorMessage: error.errorMessage || error.message || 'Unknown system error.  Please try again.'
    })
  }

}
