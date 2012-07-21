(defproject clarity "1.0.0-SNAPSHOT"
  :description "InfoClarity web application."
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [ring/ring-core "1.1.0"]
                 [ring/ring-jetty-adapter "1.1.0"]
                 [compojure "1.1.0"]
                 [postgresql/postgresql "9.1-901.jdbc4"]
                 [cheshire "4.0.0"]
                 [org.clojure/tools.logging "0.2.3"]
                 [joda-time "2.0"]
                 [log4j "1.2.16" :exclusions [javax.mail/mail
                                              javax.jms/jms
                                              com.sun.jdmk/jmxtools
                                              com.sun.jmx/jmxri]]
                 ;;[org.clojure/java.jdbc "0.2.1"]
                 [korma "0.3.0-beta11"]]
  :dev-dependencies [[ring/ring-devel "1.1.0"]]
  :plugins [[lein-ring "0.6.6"]
            [lein-swank "1.4.4"]]
  :ring {:handler clarity.core/app}
  :main clarity.core
  :jvm-opts ["-server"
             "-Xms32M" "-Xmx256M"
             "-XX:NewRatio=5"
             "-XX:+UseConcMarkSweepGC"
             "-XX:+UseParNewGC"
             "-XX:MaxPermSize=64m"])
