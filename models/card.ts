/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/* jslint node: true */
export = (sequelize, { STRING, INTEGER }) => {
  const Card = sequelize.define('Card', {
    fullName: STRING,
    cardNum: {
      type: INTEGER,
      validate: {
        isInt: true,
        min: 1000000000000000,
        max: 9999999999999998
      }
    },
    expMonth: {
      type: INTEGER,
      validate: {
        isInt: true,
        min: 1,
        max: 12
      }
    },
    expYear: {
      type: INTEGER,
      validate: {
        isInt: true,
        min: 2080,
        max: 2099
      }
    }
  })

  Card.associate = ({ User }) => {
    Card.belongsTo(User, { constraints: true, foreignKeyConstraint: true })
  }

  return Card
}
