(ns clarity.util
  (:use [clojure.string :only [blank?]])
  (:require [cheshire.core :as json])
  (:import
   (org.joda.time DateTime Days Seconds DateTimeZone Period Interval Duration)
   (org.joda.time.format DateTimeFormat)
   (org.joda.time.tz UTCProvider)))

;; ---------------------------------------------------------------------------
;; Numeric Conversion
;; ---------------------------------------------------------------------------

(defn to-i
  "Converts str to int. Returns null if input is null or conversion fails.
   Values with decimals will be trucated, so 7.75 becomes 7."
  [str]
  (if str
    (try (.intValue (Double/parseDouble str))
         (catch Throwable t nil))))

(defn to-f
  "Converts str to double-precision float. Returns null if input is null or
   conversion fails."
  [str]
  (if str
    (try (Double/parseDouble str)
         (catch Throwable t nil))))

;; ---------------------------------------------------------------------------
;; DateTime Utilities
;; ---------------------------------------------------------------------------

(def db-datetime "YYYY-MM-dd'T'HH:mm:ssZZ")
(def yyyymmdd-dash "YYYY-MM-dd")
(def yyyymmdd-slash "YYYY/MM/dd")
(def mmddyyyy-slash "MM/dd/YYYY")

(def re-db-datetime
     (re-pattern
      "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$"))
(def re-yyyymmdd-dash #"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
(def re-yyyymmdd-slash #"^[0-9]{4}/[0-9]{2}/[0-9]{2}$")
(def re-mmddyyyy-slash #"^[0-9]{2}/[0-9]{2}/[0-9]{4}$")


(defn guess-dt-format [dt-str]
  "Tries to figure out the format of a datetime string. Returns the format,
   if it can figure it out, or nil if it cannot."
  (if (string? dt-str)
    (cond
     (blank? dt-str) nil
     (re-find re-db-datetime dt-str) db-datetime
     (re-find re-yyyymmdd-dash dt-str) yyyymmdd-dash
     (re-find re-yyyymmdd-slash dt-str) yyyymmdd-slash
     (re-find re-mmddyyyy-slash dt-str) mmddyyyy-slash
     :else nil)))


(defn datetime-str
  "Returns a timestamp in the form of a string with the specified pattern."
  ([pattern]
     (datetime-str (new DateTime) pattern))
  ([dt pattern]
     (.(. DateTimeFormat forPattern pattern) print (. dt toDateTime))))

(defn parse-datetime
  "Parses a string, returns a DateTime object."
  [dt-str pattern]
  (let [fmt (. DateTimeFormat forPattern pattern)]
    (. fmt parseDateTime dt-str)))

(defn try-parse-datetime
  "Tries to guess the format of a datetime string and parse it."
  [dt-str]
  (let [pattern (guess-dt-format dt-str)]
    (if pattern
      (try (parse-datetime dt-str pattern)
           (catch Throwable t nil)))))

(defn now
  "Returns a new DateTime set to the current date and time."
  []
  (new DateTime))


;; ---------------------------------------------------------------------------
;; Query Param Utilities
;; ---------------------------------------------------------------------------


(defn date-param
  "Returns the value of the param with the specified key as a float,
   or default if the value is null or empty. param-name should be symbol."
  [date-str default]
  (let [datetime (if date-str (try-parse-datetime date-str))]
    (if datetime
      datetime
      (try-parse-datetime default))))

(defn get-param
  "Returns param from params map, cast to type. Returns default if the value
   is missing or empty."
  [params param-name type default]
  (if (blank? (param-name params))
    (if (= :datetime type)
      (try-parse-datetime default)
      default)
    (let [value (param-name params)]
      (case type
            :int (to-i value)
            :float (to-f value)
            :datetime (date-param value default)
            value))))

(defn get-params
  "Given a map of HTTP input params (in which keys are symbols), and a
   seq of config maps describing data types and default values, returns a
   map of params with values cast to the correct type. Param config looks
   like this:

   [{:name :company, :type :string, :default 'Apple'},
    {:name :age, :type :int, :default 26},
    {:name :weight, :type :float, :default 188.6},
    {:name :date_of_birth, :type :datetime, :default '02/21/1916'},
    {:name :something, :type :int, :default nil}]
  "
  [params config]
  (let [param-names (map :name config)
        values (map #(get-param params (:name %1) (:type %1) (:default %1))
                    config)]
    (zipmap param-names values)))


(defn dump-request
  "Dump the ring request hash back to the client."
  [request]
  (json/generate-string (dissoc request :body)))
