(ns clarity.data.blsoe
  (require [korma.core :as k]
           [clarity.db :as db]
           [clarity.util :as util]
           [cheshire.core :as json]))

;; Data to populate autofill queries.
;; Includes names of places, occupations, etc.
(k/defentity autofill
  (k/table :bls_oe_autofill)
  (k/database db/govdata))

;; Contains code definitions for places, occupations, etc.
(k/defentity codes
  (k/table :bls_oe_codes)
  (k/database db/govdata))

;; This is the main data table. About 5 million rows. All info is coded.
(k/defentity current-data
  (k/table :bls_oe_current)
  (k/database db/govdata))

;; Defines code types used in codes and autofill.
;; 1 = Area, 2 = Industry, etc.
(k/defentity types
  (k/table :bls_oe_types)
  (k/database db/govdata))


(defn wages
  ""
  [request]
  (json/generate-string (k/select types)))

(defn workers
  ""
  [request]
  (json/generate-string (k/select codes (k/limit 20))))


