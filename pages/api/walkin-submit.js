import {hollyburnApi, apiErrorMessage} from "../../lib/hollyburn-api";

export default function handler(req,res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  const {basicForm, qualifyForm, walkInForm} = req.body;
  const {emailAddress, firstName, lastName, phoneNumber} = basicForm;

  let api;
  try {
    api = hollyburnApi();
  } catch (error) {
    res.status(500).json({
      result: false,
      errorMessage: error.message
    });
    return;
  }

  const vacancySuites = Array.isArray(walkInForm.suites) ? walkInForm.suites : [];
  api.post('/leads/walk-in', {
    firstName, lastName, emailAddress, phoneNumber,
    propertyHmy: walkInForm.property,
    suites: vacancySuites,
    preferences: {
      moveIn: qualifyForm.moveIn || basicForm.moveIn,
      suiteTypes: qualifyForm.suiteTypes || basicForm.suiteTypes,
      maxBudget: qualifyForm.maxBudget || basicForm.maxBudget,
      numberOfOccupants: qualifyForm.numberOfOccupants || basicForm.numberOfOccupants,
      petFriendly: qualifyForm.petFriendly ? true : !!basicForm.petFriendly,
      cities: (qualifyForm.cities && qualifyForm.cities.length) ? qualifyForm.cities : basicForm.cities,
      neighbourhoods: qualifyForm.neighbourhoods && qualifyForm.neighbourhoods.length
        ? qualifyForm.neighbourhoods : basicForm.neighbourhoods
    }
  })
    .then(response => {
      res.status(200).json({
        result: true,
        data: response.data
      });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        result: false,
        errorMessage: apiErrorMessage(error)
      });
    });

}
