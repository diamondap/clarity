(ns clarity.db
  (require [korma.db :as korma]
           [clarity.config :as config]))

(def db-config
     (case config/environment
           "development" {:host "127.0.0.1"
                          :port 5432
                          :db "govdata"
                          :user "govdatauser"
                          :password "GvrLwYmPPR"}
           "test"        {:host ""
                          :port 5432
                          :db ""
                          :user ""
                          :password ""}
           "production"  {:host ""
                          :port 5432
                          :db ""
                          :user ""
                          :password ""}
           {}))

;; This is the connection to our main database
(korma/defdb govdata (korma/postgres db-config))

