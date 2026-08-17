import common from "../../messages/en/common.json";
import nav from "../../messages/en/nav.json";
import meta from "../../messages/en/meta.json";
import discover from "../../messages/en/discover.json";
import map from "../../messages/en/map.json";
import trip from "../../messages/en/trip.json";
import tripRequest from "../../messages/en/tripRequest.json";
import saved from "../../messages/en/saved.json";
import profile from "../../messages/en/profile.json";
import place from "../../messages/en/place.json";
import region from "../../messages/en/region.json";
import category from "../../messages/en/category.json";
import auth from "../../messages/en/auth.json";
import submit from "../../messages/en/submit.json";
import creators from "../../messages/en/creators.json";
import driver from "../../messages/en/driver.json";
import ai from "../../messages/en/ai.json";
import errors from "../../messages/en/errors.json";
import apiErrors from "../../messages/en/apiErrors.json";

/**
 * Static English message bundle. Used where a fixed (non-request-locale)
 * provider is needed — currently only the admin area (internal tool, kept
 * English-only regardless of the site visitor's chosen language) so that
 * shared traveler-facing components rendered there (e.g. PlacePicker) still
 * have a NextIntlClientProvider to read from.
 */
export const enMessages = {
  common,
  nav,
  meta,
  discover,
  map,
  trip,
  tripRequest,
  saved,
  profile,
  place,
  region,
  category,
  auth,
  submit,
  creators,
  driver,
  ai,
  errors,
  apiErrors,
};
