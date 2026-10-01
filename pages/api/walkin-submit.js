import {post} from "../../lib/hollyburn-api";

export default async function handler(req, res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  try {
    const {basicForm = {}, qualifyForm = {}, walkInForm = {}} = req.body || {};
    const {emailAddress, firstName, lastName, phoneNumber} = basicForm;
    const vacancyIds = Array.isArray(walkInForm.suites)
      ? walkInForm.suites.map(s => s.vacancyId)
      : [];

    const body = await post('/v2/walk-in', {
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      propertyHmy: walkInForm.property,
      vacancyIds,
      moveIn: qualifyForm.moveIn ? qualifyForm.moveIn : basicForm.moveIn,
      suiteTypes: qualifyForm.suiteTypes ? qualifyForm.suiteTypes : basicForm.suiteTypes,
      numberOfOccupants: qualifyForm.numberOfOccupants ? qualifyForm.numberOfOccupants : basicForm.numberOfOccupants,
      maxBudget: qualifyForm.maxBudget ? qualifyForm.maxBudget : basicForm.maxBudget,
      petFriendly: qualifyForm.petFriendly ? true : !!basicForm.petFriendly,
      cities: qualifyForm.cities && qualifyForm.cities.length > 0 ? qualifyForm.cities : basicForm.cities && basicForm.cities.length > 0 ? basicForm.cities : null,
      neighbourhoods: qualifyForm.neighbourhoods && qualifyForm.neighbourhoods.length > 0 ? qualifyForm.neighbourhoods : basicForm.neighbourhoods && basicForm.neighbourhoods.length > 0 ? basicForm.neighbourhoods : null
    });

    res.status(200).json({
      result: true,
      data: {id: body && body.id}
    });
  }
  catch (error) {
    res.status(500).json({
      result: false,
      errorMessage: error.errorMessage || error.message || 'unknown internal error'
    })
  }

}
