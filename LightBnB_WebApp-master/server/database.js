const properties = require('./json/properties.json');
const users = require('./json/users.json');
const {Pool} = require('pg');

/// Users
const pool = new Pool ({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});
/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {

  return pool
    .query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      return (err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const { name, email, password } = user;

  pool.query(`
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `, [name, email, password])
  .then(result => {
    return result.rows[0];
  })
  .catch(err => console.log(err.message));
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`SELECT properties.*, reservations.*, AVG(rating) AS average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  AND reservations.end_date < NOW()::DATE
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      console.log("RESULTS-->", result.rows);
      return result.rows;
    })
    .catch((err) => {
      return (err.message);
    });}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = (options, limit = 10) => {

  
  const queryParams = [];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id 
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && !queryParams) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `WHERE cost_per_night >= $${queryParams.length} `;
  } else if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }


  if (options.maximum_price_per_night && !queryParams) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `WHERE cost_per_night < $${queryParams.length} `;
  } else if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `AND cost_per_night < $${queryParams.length} `;
  }

  queryString += `GROUP BY properties.id `;
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);
 };

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryParams = [];

  // To add to query string: $1, $2, $3...
  const queryParamsNums = [];
  
  let key_of_object = 1;
  for (const key in property) {
    // push the actual value
    queryParams.push(property[key]);
    // push the index of the value as "$(index + 1)"
    queryParamsNums.push(`$${key_of_object}`);
    key_of_object++;
  }

  let sql_query =  `
  INSERT INTO properties (${Object.keys(property).join()})
  VALUES(${queryParamsNums.join()})
  RETURNING *;
  `;

  return pool.query(sql_query, queryParams)
  .then(result => {
    return result.rows[0];
  })
  .catch(err => console.log(err.message));
}

exports.addProperty = addProperty;
