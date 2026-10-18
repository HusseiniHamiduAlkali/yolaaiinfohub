'use strict';

const { PROFILE_FIELDS } = require('./navigationProfileTypes');

const PROFILE_PATHS = Array.from(new Set(Object.values(PROFILE_FIELDS).filter(Boolean)))
  .concat('healthcareProfile');

function prepareReviewableProfileUpdate(record, changes, options) {
  const status = record && record.status || 'draft';
  const demotePublished = Boolean(options && options.demotePublished);
  if (status === 'published' && !demotePublished) return null;
  if (status !== 'draft' && status !== 'published') return null;

  const updates = Object.assign({}, changes, { seedReviewRequired: true });
  if (status === 'published') {
    updates.status = 'draft';
    updates.verificationStatus = 'unverified';
  } else if (record.verificationStatus === 'verified') {
    updates.verificationStatus = 'unverified';
  }
  return updates;
}

function profileFieldsToUnset(activeField) {
  return PROFILE_PATHS.reduce(function (unset, field) {
    if (field !== activeField) unset[field] = 1;
    return unset;
  }, {});
}

module.exports = { prepareReviewableProfileUpdate, profileFieldsToUnset };
