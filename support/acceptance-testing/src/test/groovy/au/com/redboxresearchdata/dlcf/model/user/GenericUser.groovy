/*
 *
 *  * Copyright (C) 2017 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
 *  *
 *  * This program is free software: you can redistribute it and/or modify
 *  * it under the terms of the GNU General Public License as published by
 *  * the Free Software Foundation; either version 2 of the License, or
 *  * (at your option) any later version.
 *  *
 *  * This program is distributed in the hope that it will be useful,
 *  * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  * GNU General Public License for more details.
 *  *
 *  * You should have received a copy of the GNU General Public License along
 *  * with this program; if not, write to the Free Software Foundation, Inc.,
 *  * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */

package au.com.redboxresearchdata.dlcf.model.user

import au.com.redboxresearchdata.dlcf.model.credentials.AafCredentials
import au.com.redboxresearchdata.dlcf.model.credentials.GenericCredentials
import au.com.redboxresearchdata.dlcf.model.credentials.LocalCredentials

/**
 * @author Matt Mulholland
 * @date 20/6/17
 */
abstract class GenericUser {
  public final roleName
  public GenericCredentials credentials

  GenericUser(def roleName) {
    this.roleName = roleName
  }

  def setLocalCredentials() {
    this.credentials = new LocalCredentials(roleName)
  }

  def setAafCredentials() {
    this.credentials = new AafCredentials(roleName)
  }

}
