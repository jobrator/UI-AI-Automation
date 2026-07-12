@admin @company-candidate-management
Feature: Admin Company and Candidate Management
  As a platform administrator
  I want to view and manage registered companies and candidate accounts
  So that I can maintain data quality and support platform operations

  Background:
    Given the authenticated admin is on the admin dashboard

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Companies Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views and manages registered employer companies

    Background:
      Given the admin navigates to the Companies management page

    @smoke @positive @regression @TC_ACC001
    Scenario: TC_ACC001 — Companies list page displays all registered employer companies
      Then a table of company records should be displayed on the companies page
      And each company record should display the company name
      And each company record should display the contact person
      And each company record should display the contact email
      And each company record should display the contact phone
      And each company record should display the employee count
      And each company record should display the foundation date

    @regression @positive @TC_ACC002
    Scenario: TC_ACC002 — Admin can edit a company profile and persist the changes
      Given at least one company exists in the companies list
      When the admin clicks the Edit action on a company record
      And the admin modifies the company details
      And the admin saves the changes
      Then the updated company information should be reflected in the companies table

    @regression @positive @TC_ACC003
    Scenario: TC_ACC003 — Admin can delete a company record after confirming deletion
      Given at least one company exists that can be safely deleted
      When the admin clicks the Delete action on that company record
      And the admin confirms the deletion
      Then the company should be removed from the companies list

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Candidates Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views and manages registered candidate accounts

    Background:
      Given the admin navigates to the Candidates management page

    @smoke @positive @regression @TC_ACC004
    Scenario: TC_ACC004 — Candidates list page displays all registered candidates with their details
      Then a table of candidate records should be displayed on the candidates management page
      And each candidate record should display the first name
      And each candidate record should display the last name
      And each candidate record should display the gender
      And each candidate record should display the phone number
      And each candidate record should display the summary or career objective

    @regression @positive @TC_ACC005
    Scenario: TC_ACC005 — Admin can view the full candidate profile including CV details
      Given at least one candidate exists in the candidates list
      When the admin clicks the View action on a candidate record
      Then the full candidate profile detail page should load
      And the candidate profile details including CV information should be visible

    @regression @positive @TC_ACC006
    Scenario: TC_ACC006 — Admin can create a new candidate record from the admin console
      When the admin navigates to the create new candidate form
      And the admin fills in all required candidate fields with valid data
      And the admin saves the new candidate record
      Then the new candidate record should appear in the candidates list
