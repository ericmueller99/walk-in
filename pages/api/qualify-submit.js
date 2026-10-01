import {post} from "../../lib/hollyburn-api";

export default async function handler(req, res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  const {firstName, lastName, emailAddress, phoneNumber, suiteTypes, maxBudget, moveIn, petFriendly = false, numberOfOccupants, utmCampaign, utmSource, utmMedium, utmContent, utmTerm, cities, neighbourhoods} = req.body;
  if (!firstName || !lastName || !emailAddress || !phoneNumber || !suiteTypes || !maxBudget || !numberOfOccupants || !cities) {
    res.status(400).json({
      result: false,
      errorMessage: "required fields are missing"
    })
    return;
  }

  const qualification = {
    firstName,
    lastName,
    emailAddress,
    phoneNumber,
    suiteTypes,
    maxBudget,
    moveIn,
    petFriendly,
    numberOfOccupants,
    cities,
    neighbourhoods
  };
  if (utmCampaign) qualification.utmCampaign = utmCampaign;
  if (utmSource) qualification.utmSource = utmSource;
  if (utmMedium) qualification.utmMedium = utmMedium;
  if (utmContent) qualification.utmContent = utmContent;
  if (utmTerm) qualification.utmTerm = utmTerm;

  try {
    const body = await post('/leads/qualification-form', qualification);
    if (!body || body.id == null) {
      res.status(500).json({
        result: false,
        errorMessage: 'walk-in qualification did not return an id'
      });
      return;
    }
    res.status(200).json({
      result: true,
      data: {id: body.id}
    });
  }
  catch (error) {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
    res.status(status).json({
      result: false,
      errorMessage: error.errorMessage || error.message
    })
  }

}
