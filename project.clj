(defproject clarity "1.0.0-SNAPSHOT"
  :description "InfoClarity web application."
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [ring/ring-core "1.1.8"]
                 [ring/ring-jetty-adapter "1.1.8"]
                 [compojure "1.1.5"]
                 [postgresql/postgresql "9.1-901.jdbc4"]
                 [cheshire "5.0.2"]
                 [org.clojure/tools.logging "0.2.6"]
                 [de.ubercode.clostache/clostache "1.3.1"]
                 ;; TODO - replace joda time with clj-time
                 [joda-time "2.0"]
                 [clj-time "0.4.4"]

                 [log4j "1.2.16" :exclusions [javax.mail/mail
                                              javax.jms/jms
                                              com.sun.jdmk/jmxtools
                                              com.sun.jmx/jmxri]]
                 ;;[org.clojure/java.jdbc "0.2.1"]
                 [korma "0.3.0-RC4"]]
  :dev-dependencies [[ring/ring-devel "1.1.8"]]
  :plugins [[lein-ring "0.8.2"]
            [lein-swank "1.4.5"]]
  :ring {:handler clarity.core/app}
  :main clarity.core
  :jvm-opts ["-server"
             "-Xms32M" "-Xmx256M"
             "-XX:NewRatio=5"
             "-XX:+UseConcMarkSweepGC"
             "-XX:+UseParNewGC"
             "-XX:MaxPermSize=64m"])
