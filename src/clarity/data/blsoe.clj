(ns clarity.data.blsoe
  (:use [korma.core])
  (:require [clarity.db :as db]
            [clarity.util :as util]
            [cheshire.core :as json]))

;; Data to populate autofill queries.
;; Includes names of places, occupations, etc.
(defentity autofill
  (table :bls_oe_autofill)
  (database db/govdata))

;; Contains code definitions for places, occupations, etc.
(defentity codes
  (table :bls_oe_codes)
  (database db/govdata))

;; This is the main data table. About 5 million rows. All info is coded.
(defentity current-data
  (table :bls_oe_current)
  (database db/govdata))

;; Defines code types used in codes and autofill.
;; 1 = Area, 2 = Industry, etc.
(defentity types
  (table :bls_oe_types)
  (database db/govdata))

(def type-area 1)
(def type-industry 2)
;;(def type-sector 3)
;;(def type-occupation-category 4)
(def type-occupation 5)

;; These are the params we're expecting in the HTTP request
;; industry_code and occupation_code are 6-digit strings
;; area_code is a 7-digit string
;; All zeros in any of these strings indicates the highest level
;; of roll-up data-- i.e. all industries, all occupations,
;; national level.
(def param-config
     [{:name :term :type :string :default nil}
      {:name :type :type :int :default 0}
      {:name :occupation_code :type :string :default "000000"}
      {:name :industry_code :type :string :default "000000"}
      {:name :sector_code :type :string :default "000000"}
      {:name :area_code :type :string :default "000000"}])

;; Autofill query for location or occupation
(def query-loc-occ
     (str "select * from "
          "(select distinct on (value) code, value, type, matches_start "
          "from bls_oe_autofill "
          "where word ilike ? and type = ? "
          "order by value asc limit 12) as list "
          "order by matches_start desc, value asc"))

;; Autofill query for industry
(def query-industry
     (str "select distinct(a.code), a.value, a.type, a.matches_start "
          "from bls_oe_autofill a "
          "inner join bls_oe_current c on c.industry_code = a.code "
          "where a.word ilike ? and a.type = 2  "
          "and c.area_code = '0000000'  "
          "and c.occupation_code = ? "
          "order by a.matches_start desc, "
          "value asc limit 12"))

(defn wrap-like-term
  "Adds % symbol to the beginning and end of the search term,
   so we can do a LIKE query in SQL."
  [term]
  (str "%" term "%"))

(defn get-params
  "Returns properly-typed params from the request hash. Missing and
   invalid params will be set to their default values."
  [request]
  (util/get-params (:params request) param-config))

(defn wages
  ""
  [request]
  (json/generate-string (select types)))

(defn workers
  ""
  [request]
  (json/generate-string (select codes (limit 20))))

(defn autofill
  "Returns data for autofill box. This can be data for industry, occupation,
   or location. Expects the following params:

   term - The search term. A string.
   type - An integer: 1 = area, 2 = industry, 5 = occupation
   occupation - Required only if type = 2. A six-digit string representing
                an industry code.
  "
  [request]
  (let [params (get-params request)
        like-term (wrap-like-term (:term params))]
    (json/generate-string
     (if (= 2 (:type params))
       (exec-raw [query-industry
                  [like-term (:occupation_code params)]] :results)
       (exec-raw [query-loc-occ [like-term (:type params)]] :results)))))

(def query-occ-ind-stats
     (str "select datatype_code, value "
          "from bls_oe_data "
          "where area_code = ? "
          "and industry_code = ? "
          "and occupation_code = ? "
          "order by datatype_code;"))

(defn stats
  ""
  [request]
  (let [params (get-params request)]
    (json/generate-string
     (select current-data
             (fields :datatype_code :value)
             (where {:area_code (:area_code params)
                     :industry_code (:industry_code params)
                     :occupation_code (:occupation_code params)})
             (order :datatype_code :ASC)))))
