/**
 * SalesforceApiClient
 *
 * Thin wrapper around Salesforce's REST API for programmatic data setup
 * and teardown. Used by test fixtures to create/query/delete records
 * without going through the UI.
 *
 * Authentication uses Username-Password OAuth flow which works in scratch orgs.
 */

export interface SfRecord {
  id: string;
  [key: string]: unknown;
}

export interface SfQueryResult<T = Record<string, unknown>> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export class SalesforceApiClient {
  private instanceUrl: string;
  private accessToken: string | null = null;
  private apiVersion: string;

  constructor(instanceUrl: string, apiVersion = "59.0") {
    this.instanceUrl = instanceUrl.replace(/\/$/, "");
    this.apiVersion = apiVersion;
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  /**
   * Authenticate using the Username-Password OAuth flow.
   * This is suitable for automated testing with scratch orgs.
   */
  async authenticate(
    username: string,
    password: string,
    securityToken = "",
    clientId = "3MVG9n_HvETGhr3BdUj3N0GGEX.5Cp3u9oFCm5XApFAiRwFBSLnqx5_MECp0V5jB3tCZ3BjSf5v.fJkjX.P5M",
    clientSecret = ""
  ): Promise<void> {
    const loginUrl = this.instanceUrl.includes("scratch")
      ? "https://test.salesforce.com"
      : "https://login.salesforce.com";

    const params = new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password: password + securityToken,
    });

    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce OAuth failed: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      instance_url: string;
    };

    this.accessToken = data.access_token;
    this.instanceUrl = data.instance_url;
  }

  // ─── CRUD Operations ──────────────────────────────────────────────────────

  async createRecord(
    objectName: string,
    fields: Record<string, unknown>
  ): Promise<string> {
    const response = await this.apiRequest(
      "POST",
      `/sobjects/${objectName}`,
      fields
    );

    const result = response as { id: string; success: boolean; errors: unknown[] };
    if (!result.success) {
      throw new Error(
        `Failed to create ${objectName}: ${JSON.stringify(result.errors)}`
      );
    }

    return result.id;
  }

  async getRecord<T = Record<string, unknown>>(
    objectName: string,
    recordId: string,
    fields?: string[]
  ): Promise<T> {
    const fieldsParam = fields ? `?fields=${fields.join(",")}` : "";
    return this.apiRequest<T>(
      "GET",
      `/sobjects/${objectName}/${recordId}${fieldsParam}`
    );
  }

  async updateRecord(
    objectName: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    await this.apiRequest(
      "PATCH",
      `/sobjects/${objectName}/${recordId}`,
      fields
    );
  }

  async deleteRecord(objectName: string, recordId: string): Promise<void> {
    await this.apiRequest("DELETE", `/sobjects/${objectName}/${recordId}`);
  }

  async query<T = Record<string, unknown>>(
    soql: string
  ): Promise<SfQueryResult<T>> {
    const encodedQuery = encodeURIComponent(soql);
    return this.apiRequest<SfQueryResult<T>>(
      "GET",
      `/query?q=${encodedQuery}`
    );
  }

  // ─── Specific Queries ─────────────────────────────────────────────────────

  async findAccountByName(name: string): Promise<string | null> {
    const result = await this.query<{ Id: string }>(
      `SELECT Id FROM Account WHERE Name = '${name}' LIMIT 1`
    );
    return result.totalSize > 0 ? result.records[0].Id : null;
  }

  async findOpportunityByName(name: string): Promise<string | null> {
    const result = await this.query<{ Id: string }>(
      `SELECT Id FROM Opportunity WHERE Name = '${name}' LIMIT 1`
    );
    return result.totalSize > 0 ? result.records[0].Id : null;
  }

  async findUserByUsername(username: string): Promise<string | null> {
    const result = await this.query<{ Id: string }>(
      `SELECT Id FROM User WHERE Username = '${username}' LIMIT 1`
    );
    return result.totalSize > 0 ? result.records[0].Id : null;
  }

  async getUserIdByUsername(username: string): Promise<string> {
    const id = await this.findUserByUsername(username);
    if (!id) throw new Error(`User not found: ${username}`);
    return id;
  }

  async getProfileId(profileName: string): Promise<string | null> {
    // Use the Salesforce CLI query command for finding the Profile Id for 'Standard User'
    // Replaced inline SOQL with a CLI command string assigned to profileQuery as requested.
    const profileQuery = `sf data query --query "SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1" --json`;
    const result = await this.query<{ Id: string }>(profileQuery);
    return result.totalSize > 0 ? result.records[0].Id : null;
  }

  async getPermissionSetId(apiName: string): Promise<string | null> {
    const result = await this.query<{ Id: string }>(
      `SELECT Id FROM PermissionSet WHERE Name = '${apiName}' LIMIT 1`
    );
    return result.totalSize > 0 ? result.records[0].Id : null;
  }

  async assignPermissionSetToUser(
    userId: string,
    permSetId: string
  ): Promise<void> {
    // Check if already assigned
    const existing = await this.query(
      `SELECT Id FROM PermissionSetAssignment ` +
      `WHERE AssigneeId = '${userId}' AND PermissionSetId = '${permSetId}' LIMIT 1`
    );

    if (existing.totalSize > 0) {
      console.log("Permission set already assigned, skipping");
      return;
    }

    await this.createRecord("PermissionSetAssignment", {
      AssigneeId: userId,
      PermissionSetId: permSetId,
    });
  }

  /**
   * Create a user programmatically (much more reliable than UI for test setup).
   */
  async createUser(userFields: Record<string, unknown>): Promise<string> {
    return this.createRecord("User", userFields);
  }

  /**
   * Set a user's password via the setPassword resource.
   */
  async setUserPassword(userId: string, password: string): Promise<void> {
    await this.apiRequest(
      "POST",
      `/sobjects/User/${userId}/password`,
      { NewPassword: password }
    );
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async apiRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const url = `${this.instanceUrl}/services/data/v${this.apiVersion}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // 204 No Content (DELETE, PATCH) — return empty
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Salesforce API error (${response.status}) on ${method} ${path}: ${text}`
      );
    }

    if (!text) return {} as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Failed to parse Salesforce API response: ${text}`);
    }
  }
}