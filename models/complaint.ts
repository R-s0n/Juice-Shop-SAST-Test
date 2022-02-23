/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/* jslint node: true */

export = (sequelize, { STRING }) => {
  const Complaint = sequelize.define('Complaint', {
    message: STRING,
    file: STRING
  })

  Complaint.associate = ({ User }) => {
    Complaint.belongsTo(User, { constraints: true, foreignKeyConstraint: true })
  }

  return Complaint
}
