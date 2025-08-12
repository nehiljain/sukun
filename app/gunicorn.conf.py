import multiprocessing

bind = "0.0.0.0:8000"
chdir = "./"
reload = True
timeout = 600
workers = multiprocessing.cpu_count()

capture_output = True
accesslog = "-"
access_log_format = '%(t)s %(p)s [%(s)s] %(h)s %(u)s "%(r)s" [%(D)s microsec] [%(b)s byte] "%(f)s" "%(a)s"'
