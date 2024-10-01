import { IUserStubHolder } from '../stub';
import { UserRoleForbiddenError } from '../ErrorCode';
import * as _ from 'lodash';

// --------------------------------------------------------------------------
//
//  Public Methods
//
// --------------------------------------------------------------------------

export function userRolesCheck(holder: IUserStubHolder, ...roles: Array<string>): void {
    let difference = lack(holder.user.roles, roles);
    if (!_.isEmpty(difference)) {
        throw new UserRoleForbiddenError(holder.user, { has: holder.user.roles, required: roles });
    }
}

export async function rolesSomeOf(...items: Array<Promise<void>>): Promise<void> {
    if (_.isEmpty(items)) {
        return;
    }
    await Promise.all(items);
}

// --------------------------------------------------------------------------
//
//  Private Methods
//
// --------------------------------------------------------------------------

export function isHasRoles<T = string>(exists: Array<T>, required: Array<T>): boolean {
    let items = lack(exists, required);
    return _.isEmpty(items);
}

function lack<T = string>(exists: Array<T>, required: Array<T>): Array<T> {
    return _.difference(_.uniq(_.compact(required)), _.uniq(_.compact(exists)));
}
