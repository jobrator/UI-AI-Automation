@public @informational
Feature: FAQ, Contact, About and Resources Pages
  As a visitor to Jobrator
  I want to access informational pages on the platform
  So that I can find answers, contact support, and read relevant content

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: FAQ Page
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Visitor browses the FAQ page

    Background:
      Given the user navigates to the Jobrator FAQ page

    @smoke @positive @regression @TC_PUB010
    Scenario: TC_PUB010 — FAQ page displays the For Candidates and For Companies sections
      Then the "For Candidates" accordion section should be visible
      And the "For Companies" accordion section should be visible

    @regression @positive @TC_PUB011
    Scenario: TC_PUB011 — FAQ accordion items expand and collapse when clicked
      When the user clicks on a FAQ question in the For Candidates section
      Then the answer panel should expand and display its content
      When the user clicks on the same FAQ question again
      Then the answer panel should collapse and hide its content

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Contact Page
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Visitor submits the Contact Us form

    Background:
      Given the user navigates to the Jobrator Contact page

    @regression @positive @TC_PUB012
    Scenario: TC_PUB012 — Contact Us form submits successfully with all required fields filled
      When the user fills in the name field with "Test User"
      And the user fills in the contact email field with "testuser@example.com"
      And the user fills in the message field with "This is a test enquiry from automation."
      And the user clicks the Send Message button
      Then a success confirmation message should be displayed

    @regression @negative @TC_PUB013
    Scenario: TC_PUB013 — Contact form displays validation errors when submitted with empty fields
      When the user clicks the Send Message button without filling any fields
      Then validation errors should appear on the required contact form fields

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 3: About Page
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Visitor browses the About page

    Background:
      Given the user navigates to the Jobrator About page

    @regression @positive @TC_PUB014
    Scenario: TC_PUB014 — About page renders all key feature sections
      Then the "Free Resume Assessments" section should be displayed on the about page
      And the "Job Fit Scoring" section should be displayed on the about page
      And the "Help Every Step of the Way" section should be displayed on the about page

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 4: Resources / Blog Page
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Visitor browses the Resources page and reads articles

    Background:
      Given the user navigates to the Jobrator Resources page

    @regression @positive @TC_PUB015
    Scenario: TC_PUB015 — Resources page displays blog posts organised by category
      Then the Featured Posts section should be visible
      And the blog category "Career Advice" should be displayed
      And the blog category "Interview Tips" should be displayed
      And the blog category "Remote Work" should be displayed
      And the blog category "Salary Negotiation" should be displayed

    @regression @positive @TC_PUB016
    Scenario: TC_PUB016 — Resources search returns articles matching the entered keyword
      When the user enters "career" in the resources search field
      Then matching article listings should be displayed on the resources page

    @regression @positive @TC_PUB017
    Scenario: TC_PUB017 — Clicking a blog post title opens the full article page
      When the user clicks on the first visible blog post title
      Then the article page should load with the full article content visible
