/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License Version 2.0 (the 'License'). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/                                                                                   *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
/**
 * @author rjlowe
 */

'use strict';

const PinpointLib = require('./pinpoint.js');
const RendererLib = require('./renderer.js');
const {writeRendered} = require('./s3.js');

const process = async (event, options) => {

  try {

    const pinpoint = new PinpointLib(options);
    const renderer = new RendererLib(options);


    // Loop over the SNS records
    return Promise.all(event.Records.map((record, i) => {
      const body = record.body;
      const payload = JSON.parse(body);

      // Get variables from the JSON SNS payload
      const applicationId = payload.application.app_id;
      const eventTimestamp = payload.event_timestamp;
      const campaignId = payload.attributes.campaign_id;
      const treatmentId = payload.attributes.treatment_id;
      const journeyId = payload.attributes.journey_id;
      const journeyActivityId = payload.attributes.journey_activity_id;
      const endpointId = payload.client.client_id;
      const endpoint = JSON.parse(payload.client_context.custom.endpoint);

      const config = {applicationId, eventTimestamp, campaignId, treatmentId, journeyId, journeyActivityId};

      options.logger.log({
          level: 'info',
          message: JSON.stringify(config)
      });

      // Get the Content from Pinpoint
      return pinpoint.getContentParts(applicationId, config)
        .then((content) => {
          return renderer.render(campaignId, content, endpoint);
        })
        .then((rendered) => {
          console.log(rendered);
          return writeRendered(rendered, endpointId, config)
        });
    }))
      .then((results) => {
        return 'success';
      });


  } catch (err) {
    options.logger.log({
      level: 'error',
      message: JSON.stringify(err)
    });
    return Promise.reject(err);
  }


};


module.exports = {
  process
};
