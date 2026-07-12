@admin @user-management
Feature: Admin User Management
  As a platform administrator
  I want to manage platform users and their roles
  So that I can control access, enable or disable accounts, and maintain user data integrity

  Background:
    Given the authenticated admin is on the admin dashboard

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: User List and Search
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views and searches the platform user list

    Background:
      Given the admin navigates to the Users management page

    @smoke @positive @regression @TC_ADU001
    Scenario: TC_ADU001 — Users list page displays all platform users in a data table
      Then a user data table should be displayed with at least one record
      And the table should display the user ID column
      And the table should display the user name column
      And the table should display the username column
      And the table should display the email column
      And the table should display the role column
      And the table should display the enabled status column

    @regression @positive @TC_ADU002
    Scenario: TC_ADU002 — Admin can search for users by name or email
      When the admin enters a search term in the user search field
      Then only users matching the search term should appear in the user table

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: User CRUD Operations
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin creates, edits, and deletes user accounts

    Background:
      Given the admin navigates to the Users management page

    @regression @positive @TC_ADU003
    Scenario: TC_ADU003 — Admin can create a new user account
      When the admin navigates to the create new user form
      And the admin fills in all required fields for a new user with a unique email
      And the admin saves the new user
      Then the new user should appear in the users list

    @regression @positive @TC_ADU004
    Scenario: TC_ADU004 — Admin can edit an existing user record and persist changes
      Given at least one user exists in the users list
      When the admin clicks the Edit action on a user record
      And the admin modifies the user details
      And the admin saves the changes
      Then the updated user details should be reflected in the users table

    @regression @positive @TC_ADU005
    Scenario: TC_ADU005 — Admin can enable or disable a user account
      Given at least one user exists in the users list
      When the admin toggles the Enabled status for a user
      Then the user's enabled status should be updated in the users table
      And a disabled user should not be able to log into the platform

    @regression @positive @TC_ADU006
    Scenario: TC_ADU006 — Admin can delete a user record after confirming deletion
      Given at least one user exists that can be safely deleted
      When the admin clicks the Delete action on that user record
      And the admin confirms the deletion
      Then the user record should be removed from the users list

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 3: User Roles
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin manages user roles

    Background:
      Given the admin navigates to the User Roles management page

    @regression @positive @TC_ADU007
    Scenario: TC_ADU007 — User Roles page displays role records with CRUD actions
      Then the user roles table should display role records
      And each role record should display the role ID
      And each role record should display the role name
      And each role record should display the role display name
      And each role record should display available CRUD actions
