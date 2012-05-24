(ns clarity.config)

;; Returns the name of the current environment,
;; one of 'test', 'development', or 'production'."
(def environment
  (or (. System getProperty "TLP_ENV")
      (get (System/getenv) "TLP_ENV")
      "development"))

