(ns tlp.test.unit.util
  (:use [clarity.util]
        [clojure.test])
  (:import
   (org.joda.time DateTime Days Seconds DateTimeZone Period Interval Duration)
   (org.joda.time.format DateTimeFormat)
   (org.joda.time.tz UTCProvider)))


(deftest test-to-i
  (is (= 7 (to-i "7")))
  (is (= 7 (to-i "7.75")))
  (is (= -12 (to-i "-12")))
  (is (nil? (to-i "xxx")))
  (is (nil? (to-i 55)))
  (is (nil? (to-i nil))))


(deftest test-to-f
  (is (= 7.03 (to-f "7.03")))
  (is (= 7.75 (to-f "7.75")))
  (is (= -12.18 (to-f "-12.18")))
  (is (nil? (to-f "xxx")))
  (is (nil? (to-f 55)))
  (is (nil? (to-f nil))))


(deftest test-guess-dt-format
  (is (= db-datetime (guess-dt-format "2012-05-01T14:14:24-04:00")))
  (is (= yyyymmdd-dash (guess-dt-format "2012-05-01")))
  (is (= yyyymmdd-slash (guess-dt-format "2012/05/01")))
  (is (= mmddyyyy-slash (guess-dt-format "05/01/2012")))
  (is (nil? (guess-dt-format "22.05.2012")))
  (is (nil? (guess-dt-format 2345))))

(def dt (DateTime. 2012 5 1 14 16))

(deftest test-datetime-str
  (is (. (datetime-str dt db-datetime) startsWith "2012-05-01T14:16:00"))
  (is (= "2012-05-01" (datetime-str dt yyyymmdd-dash)))
  (is (= "2012/05/01" (datetime-str dt yyyymmdd-slash)))
  (is (= "05/01/2012" (datetime-str dt mmddyyyy-slash))))

(deftest test-parse-datetime
  ;; Test will break if it's not EDT
  ;;  (is (= dt (parse-datetime "2012-05-01T14:16:00-04:00" db-datetime)))
  (is (= (DateTime. 2012 5 1 0 0) (parse-datetime "2012-05-01" yyyymmdd-dash)))
  (is (= (DateTime. 2012 5 1 0 0) (parse-datetime "2012/05/01" yyyymmdd-slash)))
  (is (= (DateTime. 2012 5 1 0 0) (parse-datetime "05/01/2012" mmddyyyy-slash))))

(deftest test-try-parse-datetime
  ;; Test will break if it's not EDT
  ;;  (is (= dt (try-parse-datetime "2012-05-01T14:16:00-04:00")))
  (is (= (DateTime. 2012 5 1 0 0) (try-parse-datetime "2012-05-01")))
  (is (= (DateTime. 2012 5 1 0 0) (try-parse-datetime "2012/05/01")))
  (is (= (DateTime. 2012 5 1 0 0) (try-parse-datetime "05/01/2012")))
  (is (nil? (try-parse-datetime "05.01.2012")))
  (is (nil? (try-parse-datetime 5555))))

(deftest test-date-param
  (is (= (DateTime. 2012 5 1 0 0) (date-param "05/01/2012" "10/10/2012")))
  (is (= (DateTime. 2012 5 1 0 0) (date-param "2012-05-01" "10/10/2012")))
  (is (= (DateTime. 2012 10 10 0 0) (date-param "Bad Date String" "10/10/2012")))
  (is (= (DateTime. 2012 10 10 0 0) (date-param nil "10/10/2012"))))


(def param-config
     [{:name :param1 :type :int :default 12}
      {:name :param2 :type :float :default 21.14}
      {:name :param3 :type :datetime :default "2012-06-17"}
      {:name :param4 :type :string :default "Cherry"}
      {:name :param5 :type :string :default nil}])

;; Ring/HTTP params all come in as strings, so they should be strings in our mock
(def params {:param1 "500" :param2 "216.97" :param3 "05/21/2012" :param4 "Peach"})

(def missing-params {})
(def empty-string-params {:param1 "" :param2 "" :param3 "" :param4 "" :param5 ""})

(deftest test-get-param
  (is (= 500 (get-param params :param1 :int 12)))
  (is (= 216.97 (get-param params :param2 :float 12.99)))
  (is (= (DateTime. 2012 5 21 0 0) (get-param params :param3 :datetime "12/21/2012")))
  (is (= "Peach" (get-param params :param4 :string "Beehive"))))

(deftest test-get-params
  ;; Output of get-params has all params property parsed and typed.
  (is (= {:param1 500
          :param2 216.97
          :param3 (DateTime. 2012 5 21 0 0)
          :param4 "Peach"
          :param5 nil}
         (get-params params param-config)))
  ;; If the input map is missing items, they should be set to nil
  (is (= {:param1 12
          :param2 21.14
          :param3 (DateTime. 2012 6 17 0 0)
          :param4 "Cherry"
          :param5 nil}
         (get-params missing-params param-config)))
  (is (= {:param1 12
          :param2 21.14
          :param3 (DateTime. 2012 6 17 0 0)
          :param4 "Cherry"
          :param5 nil}
         (get-params empty-string-params param-config))))
