
let log = ()=>{};
if ( process.env.VERBOSE ){
  log = console.dir;
}

const { ValidationItem } = require("../../lib/validation-log");
const { subrecipientKey } = require("./helpers");
const ssf = require("ssf");
const _ = require("lodash");
const { getDropdownValues, initializeTemplates } = require("../get-template");

function dateIsInPeriodOfPerformance(val, content, { reportingPeriod }) {
  const dt = ssf.format("yyyy-MM-dd", val);
  return dt <= reportingPeriod.periodOfPerformanceEndDate;
}

function dateIsInReportingPeriod(val, content, { reportingPeriod }) {
  const dt = ssf.format("yyyy-MM-dd", val);
  return dt >= reportingPeriod.startDate && dt <= reportingPeriod.endDate;
}

function dateIsOnOrBefore(key) {
  return (val, content) => {
    return new Date(val).getTime() <= new Date(content[key]).getTime();
  };
}

function dateIsOnOrAfter(key) {
  return (val, content) => {
    return new Date(val).getTime() >= new Date(content[key]).getTime();
  };
}

function hasSubrecipientKey(val, content) {
  return !!subrecipientKey(content);
}

function isNotBlank(val) {
  return _.isNumber(val) || !_.isEmpty(val);
}

function isNumber(val) {
  return _.isNumber(val);
}

function isNumberOrBlank(val) {
  return _.isEmpty(val) || _.isNumber(val);
}

function isPositiveNumber(val) {
  return _.isNumber(val) && val > 0;
}

function isAtLeast50K(val) {
  return _.isNumber(val) && val >= 50000;
}

function isEqual(column) {
  return (val, content) => {
    const f1 = parseFloat(val) || 0.0;
    const f2 = parseFloat(content[column]) || 0.0;
    return Math.abs(f1-f2) < 0.01;
  };
}

function isSum(columns) {
  return (val, content) => {
    let sum = _.reduce(
      columns,
      (acc, c) => {
        if (!c) {
          return acc;
        }
        const f = parseFloat(content[c]) || 0.0;
        return acc + f;
      },
      0.0
    );
    val = Number(val) || 0; // can come in as a string
    val = _.round(val,2);
    sum = _.round(sum,2);   // parseFloat returns junk in the 11th decimal place
    if (val !== sum ) {
      // console.log(`val is ${val}, sum is ${sum}`);
    }
    return val == sum;
  };
}

function cumulativeAmountIsEqual(key, filterPredicate) {
  return (val, content, { periodSummaries }) => {
    const currentPeriodAmount = Number(content[key]) || 0.0;
    const sum = _.chain(periodSummaries)
        .filter(filterPredicate)
        .map(`current_${key}`)
        .reduce((acc, s) => acc + Number(s) || 0.0, currentPeriodAmount)
        .value();
    return _.round(val, 2) == _.round(sum, 2);
  };
}

function isValidDate(val) {
  return !_.isNaN(new Date(val).getTime());
}

function isValidSubrecipient(val, content, { subrecipientsHash }) {
  return _.has(subrecipientsHash, val);
}

function isUnitedStates(value) {
  return value == "usa" || value == "united states";
}

function isValidState(val, content) {
  log(`isValidState(${val})`);
  return (
    dropdownIncludes("state code")(val)
  );
}

function isValidZip(val, content) {
  return /^\d{5}(-\d{4})?$/.test(`${val}`);
}

function matchesFilePart(key) {
  return function(val, content, { fileParts }) {
    const fileValue = fileParts[key].replace(/^0*/, "");
    const documentValue = (val || "").toString().replace(/^0*/, "");
    return documentValue === fileValue;
  };
}

function numberIsLessThanOrEqual(key) {
  return (val, content) => {
    const other = content[key];
    return _.isNumber(val) && _.isNumber(other) && val <= other;
  };
}

function numberIsGreaterThanOrEqual(key) {
  return (val, content) => {
    const other = content[key];
    return _.isNumber(val) && _.isNumber(other) && val >= other;
  };
}

function dropdownIncludes(key) {

  return val => {
    let allDropdowns = getDropdownValues();
    if (!allDropdowns) {
      console.log(`DROPDOWN VALUES NOT INITIALIZED!! (${key})`);
      return false;
    }
    let dropdownValues = _.get(allDropdowns, key, []);

    let rv = _.includes(dropdownValues, val.toLowerCase());
    log(`${key}:${val} is ${rv ? "present" : "missing"}`);
    // log(dropdownValues);
    return rv;
  };
}

function whenBlank(key, validator) {
  return (val, content, context) => {
    return !!content[key] || validator(val, content, context);
  };
}

function whenNotBlank(key, validator) {
  return (val, content, context) => {
    return !content[key] || validator(val, content, context);
  };
}

function whenUS(key, validator) {
  return (val, content, context) => {
    return !isUnitedStates(content[key]) ||
      validator(val, content, context);
  };
}

function whenGreaterThanZero(key, validator) {
  return (val, content, context) => {
    return content[key] > 0 ? validator(val, content, context) : true;
  };
}

function addValueToMessage(message, value) {
  return message.replace("{}", `${value || ""}`);
}

function messageValue(val, options) {
  if (options && options.isDateValue && val) {
    const dt = new Date(val).getTime();
    return _.isNaN(dt) ? val : ssf.format("MM/dd/yyyy", val);
  }
  return val;
}

function includeValidator(options, context) {
  const tags = _.get(options, "tags");
  if (!tags) {
    return true;
  }
  if (!context.tags) {
    return false;
  }
  return !_.isEmpty(_.intersection(tags, context.tags));
}

function validateFields(requiredFields, content, tab, row, context = {}) {
  // console.log("------ required fields are:");
  // console.dir(requiredFields);
  // console.log("------content is");
  // console.dir(content);
  // console.log("------content end");
  const valog = [];
  requiredFields.forEach(([key, validator, message, options]) => {
    if (includeValidator(options, context)) {
      const val = content[key] || "";
      if (!validator(val, content, context)) {
        // console.log(`val ${val}, content:`);
        // console.dir(content);
        // console.log(`val ${val}, context:`);
        // console.dir(context);
        valog.push(
          new ValidationItem({
            message: addValueToMessage(
              message || `Empty or invalid entry for ${key}: "{}"`,
              messageValue(val, options)
            ),
            tab,
            row
          })
        );
      }
    }
  });
  return valog;
}

function validateDocuments(tab, validations) {
  return function(groupedDocuments, validateContext) {
    const documents = groupedDocuments[tab];
    return _.flatMap(documents, ({ content, sourceRow }) => {
      return validateFields(
        validations,
        content,
        tab,
        sourceRow,
        validateContext
      );
    });
  };
}

function validateSingleDocument(tab, validations, message) {
  return function(groupedDocuments, validateContext) {
    const documents = groupedDocuments[tab];
    let valog = [];

    if (documents && documents.length == 1) {
      const { content } = documents[0];
      const row = 2;
      let results = validateFields(validations, content, tab, row, validateContext);
      valog = valog.concat(results);

    } else {
      valog.push(new ValidationItem({ message, tab }));
    }
    return valog;
  };
}

module.exports = {
  initializeTemplates,
  cumulativeAmountIsEqual,
  dateIsInPeriodOfPerformance,
  dateIsInReportingPeriod,
  dateIsOnOrBefore,
  dateIsOnOrAfter,
  dropdownIncludes,
  hasSubrecipientKey,
  isEqual,
  isAtLeast50K,
  isNotBlank,
  isNumber,
  isNumberOrBlank,
  isPositiveNumber,
  isSum,
  isValidDate,
  isValidState,
  isValidSubrecipient,
  isValidZip,
  matchesFilePart,
  messageValue,
  numberIsLessThanOrEqual,
  numberIsGreaterThanOrEqual,
  validateDocuments,
  validateFields,
  validateSingleDocument,
  whenBlank,
  whenGreaterThanZero,
  whenNotBlank,
  whenUS
};
